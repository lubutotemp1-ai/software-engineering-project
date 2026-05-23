const express = require("express");
const router = express.Router();
const db = require("../db/database");
const authMiddleware = require("../middleware/auth");
const { consumeAiUse, getUsageStatus } = require("../utils/aiUsage");

function getModelText(response) {
  if (!response) return "";
  if (typeof response.response?.text === "function")
    return response.response.text();
  if (typeof response.text === "function") return response.text();
  if (typeof response.output_text === "string") return response.output_text;
  if (typeof response?.output?.[0]?.content?.[0]?.text === "string")
    return response.output[0].content[0].text;
  return "";
}

router.use(authMiddleware);

// POST /api/diagnosis/check - Get AI diagnosis based on symptoms
router.post("/check", async (req, res) => {
  try {
    const { symptoms, duration, severity } = req.body;

    if (!symptoms || symptoms.trim() === "") {
      return res.status(400).json({ error: "Symptoms are required." });
    }

    if (req.user.role === "patient") {
      const usage = await getUsageStatus(req.user.id);
      if (!usage.canUse) {
        return res.status(402).json({
          error: `Monthly AI limit reached (${usage.used}/${usage.limit}). Upgrade your plan for more uses.`,
          usage,
        });
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(500)
        .json({
          error:
            "GEMINI_API_KEY is not configured on the server. Please add it to the backend .env file.",
        });
    }

    console.log("Initializing GoogleGenAI for diagnosis...");
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("GoogleGenAI initialized successfully");

    const prompt = `You are a medical AI assistant in a hospital portal helping patients with preliminary health assessments.
A patient has described their symptoms. Provide a clear, empathetic, plain-text response (no markdown, no bullet symbols, just clean paragraphs).

Patient symptoms: ${symptoms}
Duration: ${duration || "Not specified"}
Severity: ${severity || "Not specified"}

Structure your response as follows (plain text paragraphs, no bullet points or markdown):

Overview: Briefly acknowledge the symptoms and what they could generally indicate.

Possible Conditions: List 2-4 possible conditions that could explain these symptoms, with a short description of each.

Recommended Next Steps: Describe what the patient should do - whether to see a GP, specialist, or get tests done.

Warning Signs: Mention any symptoms that would require immediate emergency care.

Self-Care Tips: Provide appropriate general advice for managing symptoms at home if safe to do so.

Disclaimer: Remind the patient that this is NOT a substitute for professional medical advice and they should consult a qualified healthcare provider for a proper diagnosis and treatment.`;

    console.log("Sending symptoms to Gemini model...");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    console.log("Received response from Gemini model");

    const diagnosisText = getModelText(response);

    // Save to database
    const result = await db.run_(
      `INSERT INTO ai_diagnoses (patient_id, patient_name, symptoms, duration, severity, diagnosis)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.user.id,
        req.user.name,
        symptoms,
        duration || null,
        severity || null,
        diagnosisText,
      ],
    );

    const insertedId = result.lastInsertRowid || result.rows?.[0]?.id;
    let savedDiagnosis;

    if (insertedId) {
      savedDiagnosis = await db.get_(
        "SELECT * FROM ai_diagnoses WHERE id = ?",
        [insertedId],
      );
    } else {
      savedDiagnosis = await db.get_(
        "SELECT * FROM ai_diagnoses WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1",
        [req.user.id],
      );
    }

    if (req.user.role === "patient") {
      await consumeAiUse(req.user.id);
    }

    res.json({
      diagnosis: savedDiagnosis,
      text: diagnosisText,
    });
  } catch (err) {
    console.error("Gemini diagnosis error:");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Full error object:", JSON.stringify(err, null, 2));
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
    res
      .status(500)
      .json({ error: err.message || "Failed to get AI diagnosis." });
  }
});

// GET /api/diagnosis/history - Get user's diagnosis history
router.get("/history", async (req, res) => {
  try {
    const diagnoses = await db.all_(
      `SELECT * FROM ai_diagnoses WHERE patient_id = ? ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(diagnoses);
  } catch (err) {
    console.error("Diagnosis history error:", err.message);
    res.status(500).json({ error: "Failed to fetch diagnosis history." });
  }
});

// GET /api/diagnosis/received - Doctor gets diagnoses sent to them
router.get("/received", async (req, res) => {
  if (req.user.role !== "doctor")
    return res.status(403).json({ error: "Doctor access required." });
  try {
    const diagnoses = await db.all_(
      `SELECT * FROM ai_diagnoses WHERE doctor_id = ? AND sent_to_doctor = TRUE ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(diagnoses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch diagnoses." });
  }
});

// GET /api/diagnosis/:id - Get a specific diagnosis
router.get("/:id", async (req, res) => {
  try {
    const diagnosis = await db.get_(
      `SELECT * FROM ai_diagnoses WHERE id = ? AND patient_id = ?`,
      [req.params.id, req.user.id],
    );
    if (!diagnosis) {
      return res.status(404).json({ error: "Diagnosis not found." });
    }
    res.json(diagnosis);
  } catch (err) {
    console.error("Get diagnosis error:", err.message);
    res.status(500).json({ error: "Failed to fetch diagnosis." });
  }
});

// POST /api/diagnosis/:id/send-to-doctor
router.post("/:id/send-to-doctor", async (req, res) => {
  try {
    let { doctorId, appointmentId } = req.body;

    // Convert doctorId to integer
    doctorId = parseInt(doctorId, 10);

    if (!doctorId || isNaN(doctorId)) {
      return res.status(400).json({ error: "Valid doctor ID is required." });
    }

    const diagnosis = await db.get_(
      `SELECT * FROM ai_diagnoses WHERE id = ? AND patient_id = ?`,
      [req.params.id, req.user.id],
    );
    if (!diagnosis) {
      return res.status(404).json({ error: "Diagnosis not found." });
    }

    // CRITICAL: Prevent sending to multiple doctors - only send to the ONE selected doctor
    // If already sent, don't send again
    if (diagnosis.sent_to_doctor === 1) {
      return res
        .status(400)
        .json({
          error:
            "This diagnosis has already been sent to a doctor. Please create a new diagnosis to send to a different doctor.",
        });
    }

    const doctor = await db.get_("SELECT id, name FROM doctors WHERE id = ?", [
      doctorId,
    ]);
    if (!doctor) {
      console.error(`Doctor not found - ID: ${doctorId}`);
      return res
        .status(404)
        .json({ error: `Doctor with ID ${doctorId} not found.` });
    }

    // Update diagnosis with ONLY this specific doctor
    await db.run_(
      `UPDATE ai_diagnoses SET sent_to_doctor = TRUE, doctor_id = ?, sent_to_doctor_name = ?, appointment_id = ? WHERE id = ?`,
      [doctor.id, doctor.name, appointmentId || null, req.params.id],
    );

    // Send a chat message to ONLY this specific doctor
    await db.run_(
      `INSERT INTO chat_messages (sender_id, sender_role, receiver_id, receiver_role, message) VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        "patient",
        doctor.id,
        "doctor",
        `AI Diagnosis Report - ${req.user.name}\n\nI have completed an AI health assessment and wanted to share the results with you.\n\nSymptoms: ${diagnosis.symptoms}\nDuration: ${diagnosis.duration || "Not specified"}\nSeverity: ${diagnosis.severity || "Not specified"}\n\nPlease review my AI diagnosis before our appointment. Thank you!`,
      ],
    );

    res.json({ message: "Diagnosis sent to doctor successfully!" });
  } catch (err) {
    console.error("Send to doctor error:", err.message);
    res.status(500).json({ error: "Failed to send diagnosis to doctor." });
  }
});

// DELETE /api/diagnosis/:id
router.delete("/:id", async (req, res) => {
  try {
    const diagnosis = await db.get_(
      `SELECT * FROM ai_diagnoses WHERE id = ? AND patient_id = ?`,
      [req.params.id, req.user.id],
    );
    if (!diagnosis) {
      return res.status(404).json({ error: "Diagnosis not found." });
    }
    await db.run_("DELETE FROM ai_diagnoses WHERE id = ?", [req.params.id]);
    res.json({ message: "Diagnosis deleted." });
  } catch (err) {
    console.error("Delete diagnosis error:", err.message);
    res.status(500).json({ error: "Failed to delete diagnosis." });
  }
});

module.exports = router;
