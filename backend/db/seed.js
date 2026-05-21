const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'health_portal.db');

const db = new sqlite3.Database(DB_PATH);

// Hash passwords
const hashedPassword = bcrypt.hashSync('admin123', 10);
const doctorPassword = bcrypt.hashSync('doctor123', 10);

db.serialize(() => {
  let completed = 0;
  const total = 2;

  const checkCompletion = () => {
    completed++;
    if (completed === total) {
      db.close();
    }
  };

  // Insert admin user
  db.run(
    `INSERT OR IGNORE INTO users (name, email, password, role) 
     VALUES ('Admin', 'admin@hospital.com', ?, 'admin')`,
    [hashedPassword],
    function(err) {
      if (err) {
        console.error('Error inserting admin:', err.message);
      } else {
        if (this.changes > 0) {
          console.log('✅ Admin account created successfully!');
          console.log('   Email: admin@hospital.com');
          console.log('   Password: admin123');
        } else {
          console.log('ℹ️ Admin account already exists.');
        }
      }
      checkCompletion();
    }
  );

  // Insert sample doctors
  const doctors = [
    { name: 'Dr. Sarah Johnson', email: 'sarah@hospital.com', department: 'Cardiology', specialization: 'Heart Disease' },
    { name: 'Dr. Michael Chen', email: 'michael@hospital.com', department: 'Neurology', specialization: 'Brain & Spine' },
    { name: 'Dr. Emma Williams', email: 'emma@hospital.com', department: 'General Practice', specialization: 'Family Medicine' },
    { name: 'Dr. James Brown', email: 'james@hospital.com', department: 'Orthopedics', specialization: 'Bone & Joint' },
    { name: 'Dr. Lisa Anderson', email: 'lisa@hospital.com', department: 'Dermatology', specialization: 'Skin Conditions' },
  ];

  let doctorCount = 0;
  doctors.forEach(doc => {
    db.run(
      `INSERT OR IGNORE INTO doctors (name, email, password, department, specialization) 
       VALUES (?, ?, ?, ?, ?)`,
      [doc.name, doc.email, doctorPassword, doc.department, doc.specialization],
      function(err) {
        if (err) {
          console.error(`Error inserting doctor ${doc.name}:`, err.message);
        } else {
          if (this.changes > 0) {
            doctorCount++;
          }
        }
      }
    );
  });

  // Check for doctors in database after insertion
  setTimeout(() => {
    db.all(`SELECT id, name, email FROM doctors LIMIT 5`, (err, doctors) => {
      if (doctors && doctors.length > 0) {
        console.log(`✅ ${doctors.length} doctor(s) available in system:`);
        doctors.forEach(d => {
          console.log(`   ID: ${d.id} | Dr. ${d.name} | ${d.email}`);
        });
      } else {
        console.log('ℹ️ No doctors found in system.');
      }
      checkCompletion();
    });
  }, 500);
});