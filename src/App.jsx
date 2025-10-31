import React, { useState, useEffect, useRef } from 'react';
// import html2pdf from 'html2pdf.js'; // <-- THIS WAS THE ERROR, I'VE REMOVED IT
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  onSnapshot,
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import {
  User,
  Lock,
  ArrowLeft,
  CheckCircle,
  Printer,
  Search,
  ChevronDown,
  AlertCircle,
  FileText,
  Clock,
  LogOut,
  Mail,
  Check,
  X,
  Eye,
  XCircle,
  Download,
  SearchCheck,
  Ticket
} from 'lucide-react';

// --- Firebase Configuration ---
// This code block now *only* loads from your Vite/Vercel environment variables.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

// Check if keys are missing and warn the user
if (!firebaseConfig.apiKey) {
  console.warn("Firebase config not found. Using placeholders. Please set up your .env.local file.");
  // Use placeholders to avoid a total crash, though it will fail
  firebaseConfig.apiKey = "YOUR_API_KEY";
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Use a fallback app ID if not provided
const appId = typeof __app_id !== 'undefined' ? __app_id : (firebaseConfig.appId || 'default-app-id');

// --- Helper Components ---

// Loading Spinner
const Spinner = ({ white = true }) => (
  <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 ${white ? 'text-white' : 'text-cyan-600'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Form Input
const FormInput = ({ id, label, required = true, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
      {...props}
    />
  </div>
);

// Form Select
const FormSelect = ({ id, label, children, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} <span className="text-red-500">*</span>
    </label>
    <select
      id={id}
      className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
      {...props}
    >
      {children}
    </select>
  </div>
);

// Form Radio Group
const FormRadioGroup = ({ label, name, options, value, onChange }) => (
  <fieldset>
    <legend className="block text-sm font-medium text-gray-700 mb-1">
      {label} <span className="text-red-500">*</span>
    </legend>
    <div className="flex items-center space-x-4">
      {options.map((option) => (
        <label key={option} className="flex items-center">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={onChange}
            className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
          />
          <span className="ml-2 text-sm text-gray-700">{option}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

// File Input (Now optional)
const FileInput = ({ id, label, max_size, onChange, error }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} (Optional)
    </label>
    <input
      id={id}
      type="file"
      onChange={onChange}
      className="block w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-md file:border-0
        file:text-sm file:font-semibold
        file:bg-cyan-50 file:text-cyan-700
        hover:file:bg-cyan-100"
    />
    <p className="mt-1 text-xs text-gray-500">Max size: {max_size}.</p>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

// Modal Component
const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-110px)]">
          {children}
        </div>
      </div>
    </div>
  );
};


// --- Main Application Components ---

// App Header
const AppHeader = ({ user, onLoginClick, onLogoutClick }) => (
  <header className="bg-white shadow-md sticky top-0 z-50">
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex-shrink-0 flex items-center">
          <svg className="h-8 w-auto text-cyan-500" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <span className="ml-2 text-xl font-bold text-gray-800">Ajmal Super 40</span>
        </div>
        <div className="flex items-center">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-1 text-cyan-600" />
                {user.email}
              </span>
              <button
                onClick={onLogoutClick}
                className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <User className="w-4 h-4 mr-2" />
              Admin Login
            </button>
          )}
        </div>
      </div>
    </nav>
  </header>
);

// Student Application Form
const StudentApplicationForm = ({ setView, setSubmittedData }) => {
  const [formData, setFormData] = useState({
    session: '2026-2027',
    admissionClass: '',
    location: '',
    studentName: '',
    dob: '',
    gender: '',
    religion: '',
    email: '',
    fatherName: '',
    fatherOccupation: '',
    whatsappNo: '',
    motherName: '',
    motherOccupation: '',
    mobileNo: '',
    village: '',
    postOffice: '',
    pinCode: '',
    state: 'Assam',
    district: '',
    examState: 'Assam',
    examDistrict: '',
    examCentre: '',
    infoSource: '',
  });

  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, setFile, setError) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB
        setError('File is too large. Max size: 500KB.');
        setFile(null);
      } else {
        setError('');
        setFile(file);
      }
    }
  };
  
  // Real email function with BETTER DEBUGGING
  const sendConfirmationEmail = async (applicationData) => {
    try {
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: applicationData.studentName,
          studentEmail: applicationData.email,
          applicationNumber: applicationData.applicationNumber
        }),
      });
      
      if (!response.ok) {
        // Get the error message from the backend
        const errorBody = await response.json(); 
        console.error('Backend error response:', errorBody);
        throw new Error(`Email server error: ${errorBody.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Email sent successfully:', result);
      
    } catch (error) {
      // This will now log the detailed error from the backend
      console.error("Failed to send confirmation email:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      'admissionClass', 'location', 'studentName', 'dob', 'gender', 'religion', 'email',
      'fatherName', 'fatherOccupation', 'whatsappNo', 'motherName', 'motherOccupation',
      'mobileNo', 'village', 'postOffice', 'pinCode', 'district', 'examDistrict', 'examCentre', 'infoSource'
    ];
    
    const missingField = requiredFields.find(field => !formData[field]);
    if (missingField) {
      setFormError(`Please fill out the "${missingField}" field.`);
      window.scrollTo(0, 0);
      return;
    }

    if (photoError || signatureError) {
      setFormError('Please fix the errors in your file uploads.');
      window.scrollTo(0, 0);
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      // 1. Generate Application Number
      const appNumber = `AS40-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      let photoURL = '';
      let signatureURL = '';

      // 2. Upload Photo (if exists)
      if (photo) {
        const photoRef = ref(storage, `uploads/${appNumber}-photo-${photo.name}`);
        const photoSnap = await uploadBytes(photoRef, photo);
        photoURL = await getDownloadURL(photoSnap.ref);
      }

      // 3. Upload Signature (if exists)
      if (signature) {
        const sigRef = ref(storage, `uploads/${appNumber}-signature-${signature.name}`);
        const sigSnap = await uploadBytes(sigRef, signature);
        signatureURL = await getDownloadURL(sigSnap.ref);
      }
      
      // 4. Prepare data for Firestore
      const applicationData = {
        ...formData,
        applicationNumber: appNumber,
        photoURL: photoURL,
        signatureURL: signatureURL,
        status: 'Pending',
        submittedAt: serverTimestamp(),
        email: formData.email
      };

      // 5. Save to Firestore
      const docRef = await addDoc(collection(db, "applications"), applicationData);
      
      console.log("Application submitted with ID: ", docRef.id);
      
      // 6. Send email (fire-and-forget, don't wait for it)
      sendConfirmationEmail(applicationData);

      // 7. Redirect to success page
      setSubmittedData(applicationData);
      setView('success');

    } catch (error) {
      console.error("Error submitting application: ", error);
      setFormError(`An error occurred: ${error.message}. Please try again.`);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white rounded-lg shadow-xl my-12">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajmal Super 40</h1>
          <p className="text-gray-600">Admission Form</p>
        </div>
        <button
          onClick={() => setView('checkStatus')}
          className="flex items-center px-4 py-2 border border-cyan-600 text-sm font-medium rounded-md text-cyan-600 bg-white hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
        >
          <SearchCheck className="w-4 h-4 mr-2" />
          Check Status / Admit Card
        </button>
      </div>

      <div className="bg-cyan-600 p-3 rounded-md mb-6">
        <h2 className="text-lg font-semibold text-white">APPLICATION FORM</h2>
      </div>

      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Course Details */}
        <div className="p-4 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600 mb-4">(<span className="text-red-500">*</span> marks are compulsory)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect id="session" label="Session" name="session" value={formData.session} onChange={handleChange}>
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </FormSelect>
            <FormSelect id="admissionClass" label="Seeking Admission in Class" name="admissionClass" value={formData.admissionClass} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="11th Science">11th Science</option>
              <option value="12th Science">12th Science</option>
              <option value="Repeater">Repeater</option>
            </FormSelect>
            <FormSelect id="location" label="In which location of Ajmal Super 40 do you want to study?" name="location" value={formData.location} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Guwahati">Guwahati</option>
              <option value="Hojai">Hojai</option>
              <option value="Dhubri">Dhubri</option>
            </FormSelect>
          </div>
        </div>
        
        {/* Section 2: Personal Details */}
        <div className="p-4 border border-gray-200 rounded-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">PERSONAL DETAILS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput id="studentName" label="Name of Student" name="studentName" value={formData.studentName} onChange={handleChange} required />
            <FormInput id="dob" label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
            <FormRadioGroup label="Gender" name="gender" options={['Female', 'Male', 'Other']} value={formData.gender} onChange={handleChange} />
            <FormRadioGroup label="Religion" name="religion" options={['Hinduism', 'Christianity', 'Islam', 'Sikhism', 'Other']} value={formData.religion} onChange={handleChange} />
            <FormInput id="fatherName" label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
            <FormInput id="fatherOccupation" label="Father's Occupation" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} required />
            <FormInput id="email" label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <FormInput id="whatsappNo" label="WhatsApp No." name="whatsappNo" type="tel" value={formData.whatsappNo} onChange={handleChange} required />
            <FormInput id="motherName" label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} required />
            <FormInput id="motherOccupation" label="Mother's Occupation" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} required />
            <FormInput id="mobileNo" label="Mobile No." name="mobileNo" type="tel" value={formData.mobileNo} onChange={handleChange} required />
          </div>
        </div>

        {/* Section 3: Postal Address */}
        <div className="p-4 border border-gray-200 rounded-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">POSTAL ADDRESS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput id="village" label="Village / Town / City" name="village" value={formData.village} onChange={handleChange} required />
            <FormInput id="postOffice" label="Post Office" name="postOffice" value={formData.postOffice} onChange={handleChange} required />
            <FormInput id="pinCode" label="PIN Code" name="pinCode" type="number" value={formData.pinCode} onChange={handleChange} required />
            <FormSelect id="state" label="State" name="state" value={formData.state} onChange={handleChange} required>
              <option value="Assam">Assam</option>
            </FormSelect>
            <FormSelect id="district" label="District" name="district" value={formData.district} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Barpeta">Barpeta</option>
              <option value="Dhubri">Dhubri</option>
              <option value="Goalpara">Goalpara</option>
              <option value="Guwahati">Guwahati</option>
              <option value="Hojai">Hojai</option>
              <option value="Nagaon">Nagaon</option>
            </FormSelect>
          </div>
        </div>

        {/* Section 4: Exam Centre */}
        <div className="p-4 border border-gray-200 rounded-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">SELECT EXAM CENTRE</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect id="examState" label="State" name="examState" value={formData.examState} onChange={handleChange} required>
              <option value="Assam">Assam</option>
            </FormSelect>
            <FormSelect id="examDistrict" label="District" name="examDistrict" value={formData.examDistrict} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Barpeta">Barpeta</option>
              <option value="Dhubri">Dhubri</option>
              <option value="Goalpara">Goalpara</option>
              <option value="Guwahati">Guwahati</option>
              <option value="Hojai">Hojai</option>
              <option value="Nagaon">Nagaon</option>
            </FormSelect>
            <FormSelect id="examCentre" label="Centre" name="examCentre" value={formData.examCentre} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Centre A (Guwahati)">Centre A (Guwahati)</option>
              <option value="Centre B (Hojai)">Centre B (Hojai)</option>
              <option value="Centre C (Dhubri)">Centre C (Dhubri)</option>
            </FormSelect>
          </div>
        </div>
        
        {/* Section 5: File Uploads */}
        <div className="p-4 border border-gray-200 rounded-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">UPLOADS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileInput id="photo" label="Upload Passport Photo" max_size="500KB" onChange={(e) => handleFileChange(e, setPhoto, setPhotoError)} error={photoError} />
            <FileInput id="signature" label="Upload Signature" max_size="500KB" onChange={(e) => handleFileChange(e, setSignature, setSignatureError)} error={signatureError} />
          </div>
        </div>

        {/* Section 6: Info Source */}
        <div className="p-4 border border-gray-200 rounded-md">
          <FormSelect id="infoSource" label="From which sources did you get the information about Ajmal Super 40?" name="infoSource" value={formData.infoSource} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="Newspaper">Newspaper</option>
            <option value="Social Media">Social Media</option>
            <option value="Friends/Family">Friends/Family</option>
            <option value="School/Teacher">School/Teacher</option>
            <option value="Other">Other</option>
          </FormSelect>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex justify-center items-center w-full md:w-1/2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-400"
          >
            {loading ? <Spinner /> : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Submission Success Page
const SubmissionSuccess = ({ data, setView }) => {
  const printRef = useRef();
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    setLoading(true);
    const element = printRef.current;
    const opt = {
      margin:       0.5,
      filename:     `AS40-Application-${data.applicationNumber}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, allowTaint: true, logging: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    if (!window.html2pdf) {
      alert("PDF library is not loaded. Please refresh.");
      setLoading(false);
      return;
    }

    window.html2pdf().from(element).set(opt).save().then(() => {
      setLoading(false);
    }).catch(err => {
      console.error("PDF generation failed:", err);
      setLoading(false);
    });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 sm:p-8 my-12">
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-6 rounded-lg shadow-lg mb-8">
          <div className="flex items-center">
            <CheckCircle className="h-12 w-12 text-green-500 mr-4" />
            <div>
              <h2 className="text-2xl font-bold">Application Received!</h2>
              <p className="text-lg">Thank for submitting your application to Ajmal Super 40.</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-md mt-6">
            <p className="text-md text-gray-800">Your Application Number is:</p>
            <p className="text-3xl font-bold text-cyan-700 tracking-wider my-2">{data.applicationNumber}</p>
            <p className="text-sm text-gray-600">Please save this number for future reference. A confirmation email has been sent to <strong className="text-gray-800">{data.email}</strong>.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-400"
          >
            {loading ? <Spinner /> : <Printer className="w-5 h-5 mr-2" />}
            {loading ? 'Generating PDF...' : 'Print / Save Application'}
          </button>
          <button
            onClick={() => setView('form')}
            className="flex justify-center items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Form
          </button>
        </div>
      </div>

      {/* --- FIX FOR BLANK PDF --- */}
      {/* This is now off-screen, not hidden, so html2pdf can see it */}
      {/* --- REMOVED p-8 --- */}
      <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}>
        <div ref={printRef} className="bg-white">
          {/* --- ADDED MARGINS HERE --- */}
          <div className="border-2 border-gray-800 m-8">
            <h1 className="text-2xl font-bold text-center text-white bg-cyan-600 p-3">Ajmal Super 40 - Admission Form</h1>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-300">
                <div>
                  <strong className="text-gray-600 block text-lg">Application Number:</strong>
                  <span className="text-2xl font-bold">{data.applicationNumber}</span>
                </div>
                <div>
                  <strong className="text-gray-600 block text-lg">Status:</strong>
                  <span className="text-2xl font-bold">Submitted</span>
                </div>
              </div>

              {/* Section A: Applicant Details */}
              <div className="mt-6">
                <h3 className="bg-gray-800 text-white font-semibold p-2 rounded-t-md">A. Applicant Details</h3>
                <div className="border border-gray-300 p-4 grid grid-cols-2 gap-x-8 gap-y-4">
                  <div><strong className="text-gray-600 text-sm block">Name:</strong> <span className="text-lg">{data.studentName}</span></div>
                  <div><strong className="text-gray-600 text-sm block">DOB:</strong> <span className="text-lg">{data.dob}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Gender:</strong> <span className="text-lg">{data.gender}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Religion:</strong> <span className="text-lg">{data.religion}</span></div>
                  <div className="col-span-2"><strong className="text-gray-600 text-sm block">Email:</strong> <span className="text-lg">{data.email}</span></div>
                </div>
              </div>

              {/* Section B: Parent & Contact */}
              <div className="mt-6">
                <h3 className="bg-gray-800 text-white font-semibold p-2 rounded-t-md">B. Parent & Contact Details</h3>
                <div className="border border-gray-300 p-4 grid grid-cols-2 gap-x-8 gap-y-4">
                  <div><strong className="text-gray-600 text-sm block">Father's Name:</strong> <span className="text-lg">{data.fatherName}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Occupation:</strong> <span className="text-lg">{data.fatherOccupation}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Mother's Name:</strong> <span className="text-lg">{data.motherName}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Occupation:</strong> <span className="text-lg">{data.motherOccupation}</span></div>
                  <div><strong className="text-gray-600 text-sm block">WhatsApp No:</strong> <span className="text-lg">{data.whatsappNo}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Mobile No:</strong> <span className="text-lg">{data.mobileNo}</span></div>
                </div>
              </div>

              {/* Section C: Postal Address */}
              <div className="mt-6">
                <h3 className="bg-gray-800 text-white font-semibold p-2 rounded-t-md">C. Postal Address</h3>
                <div className="border border-gray-300 p-4 grid grid-cols-2 gap-x-8 gap-y-4">
                  <div><strong className="text-gray-600 text-sm block">Village/Town:</strong> <span className="text-lg">{data.village}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Post Office:</strong> <span className="text-lg">{data.postOffice}</span></div>
                  <div><strong className="text-gray-600 text-sm block">PIN Code:</strong> <span className="text-lg">{data.pinCode}</span></div>
                  <div><strong className="text-gray-600 text-sm block">District:</strong> <span className="text-lg">{data.district}</span></div>
                  <div><strong className="text-gray-600 text-sm block">State:</strong> <span className="text-lg">{data.state}</span></div>
                </div>
              </div>

              {/* Section D: Course & Centre */}
              <div className="mt-6">
                <h3 className="bg-gray-800 text-white font-semibold p-2 rounded-t-md">D. Course & Centre Details</h3>
                <div className="border border-gray-300 p-4 grid grid-cols-2 gap-x-8 gap-y-4">
                  <div><strong className="text-gray-600 text-sm block">Session:</strong> <span className="text-lg">{data.session}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Applying for Class:</strong> <span className="text-lg">{data.admissionClass}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Study Location:</strong> <span className="text-lg">{data.location}</span></div>
                  <div><strong className="text-gray-600 text-sm block">Exam Centre:</strong> <span className="text-lg">{data.examCentre}</span></div>
                </div>
              </div>

              {/* Section E: Documents */}
              <div className="mt-6">
                <h3 className="bg-gray-800 text-white font-semibold p-2 rounded-t-md">E. Documents Attached</h3>
                <div className="border border-gray-300 p-4 flex space-x-6">
                  <div className="text-center">
                    {data.photoURL ? <img src={data.photoURL} alt="Passport Photo" className="w-32 h-40 object-cover border-2 border-gray-300" crossOrigin="anonymous" /> : <div className="w-32 h-40 border-2 border-dashed flex items-center justify-center text-gray-500">No Photo</div>}
                    <p className="font-semibold mt-2">Passport Photo</p>
                  </div>
                  <div className="text-center">
                    {data.signatureURL ? <img src={data.signatureURL} alt="Signature" className="w-32 h-16 object-contain border-2 border-gray-300" crossOrigin="anonymous" /> : <div className="w-32 h-16 border-2 border-dashed flex items-center justify-center text-gray-500">No Signature</div>}
                    <p className="font-semibold mt-2">Signature</p>
                  </div>
                </div>
              </div>

              <div className="mt-16 text-center text-sm text-gray-600">
                <p>Submitted On: {new Date(data.submittedAt?.seconds * 1000).toLocaleString()}</p>
                <p className="mt-12 border-t border-gray-400 pt-2 inline-block">Signature of Applicant</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


// Admin Login Page
const AdminLogin = ({ setView, setAuthError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will handle the view change
    } catch (error) {
      console.error(error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen-nonav bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-lg border border-gray-200">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-cyan-100 rounded-full">
            <Lock className="w-8 h-8 text-cyan-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-center text-gray-900">Admin Login</h2>
          <p className="text-gray-600">Access the Super 40 Dashboard</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1 relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-400"
            >
              {loading ? <Spinner /> : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
      <button
        onClick={() => { setView('form'); setAuthError(''); }}
        className="flex items-center mt-6 text-sm font-medium text-cyan-600 hover:text-cyan-500"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Application Form
      </button>
    </div>
  );
};

// --- NEW ADMIN DASHBOARD (Table + Modal) ---
const AdminDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null); // For the modal
  
  // Data Fetching
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "applications"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps = [];
      querySnapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      // Sort by submission date, newest first
      apps.sort((a, b) => (b.submittedAt?.toDate() || 0) - (a.submittedAt?.toDate() || 0));
      setApplications(apps);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Failed to load applications. Please check console and security rules.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Filtering Logic
  const filteredApplications = applications
    .filter(app => filter === 'All' || app.status === filter)
    .filter(app => 
      app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
  // Status Update Logic
  const updateStatus = async (id, newStatus, appData) => {
    if (!window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this application?`)) {
      return;
    }
    const appRef = doc(db, "applications", id);
    try {
      let updateData = { status: newStatus };
      
      // If approving, generate Roll Number and set Exam Details
      if (newStatus === 'Approved') {
        const rollNumber = `AS40R-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        updateData = {
          ...updateData,
          rollNumber: rollNumber,
          examTime: "10:00 AM - 12:00 PM", // Example: Hardcode this
          examDate: "2025-12-15", // Example: Hardcode this
          examCentre: appData.examCentre // Use the centre they chose
        };
      }
      
      await updateDoc(appRef, updateData);
      
    } catch (err) {
      console.error("Error updating status: ", err);
      alert("Failed to update status. See console for details.");
    }
  };
  
  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };
  
  // Detail Row Component for Modal
  const DetailRow = ({ label, value }) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || '-'}</dd>
    </div>
  );
  
  return (
    <>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
          {/* Header & Controls */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Application Management</h2>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              {/* Filter Buttons */}
              <div className="flex space-x-2">
                {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      filter === f
                        ? f === 'All' ? 'bg-cyan-600 text-white' :
                          f === 'Pending' ? 'bg-yellow-500 text-white' :
                          f === 'Approved' ? 'bg-green-600 text-white' :
                          'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
          
          {/* Error/Loading State */}
          {loading && <p className="p-4 text-gray-600 text-center">Loading applications...</p>}
          {error && <p className="p-4 text-red-600 text-center">{error}</p>}
          
          {/* Application Table */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant Details</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Centre</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No applications found.</td>
                    </tr>
                  ) : (
                    filteredApplications.map(app => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{app.studentName}</div>
                          <div className="text-sm text-gray-500">{app.applicationNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{app.email}</div>
                          <div className="text-sm text-gray-500">M: {app.mobileNo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{app.admissionClass}</div>
                          <div className="text-sm text-gray-500">Exam: {app.examCentre}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="p-2 text-cyan-600 bg-cyan-100 rounded-full hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              title="View Application"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {app.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => updateStatus(app.id, 'Approved', app)}
                                  className="p-2 text-white bg-green-600 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateStatus(app.id, 'Rejected', app)}
                                  className="p-2 text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* View Application Modal */}
      <Modal show={!!selectedApp} onClose={() => setSelectedApp(null)} title="Full Application Details">
        {selectedApp && (
          <div className="space-y-8">
            {/* Applicant Details Section */}
            <section>
              <div className="bg-gray-800 text-white -mx-6 -mt-6 p-4 px-6 rounded-t-lg">
                <h4 className="text-lg font-semibold">A. Applicant Details</h4>
              </div>
              <div className="mt-4 border-b border-gray-200 pb-4">
                <dl className="divide-y divide-gray-200">
                  <DetailRow label="Name" value={selectedApp.studentName} />
                  <DetailRow label="Date of Birth" value={selectedApp.dob} />
                  <DetailRow label="Gender" value={selectedApp.gender} />
                  <DetailRow label="Religion" value={selectedApp.religion} />
                  <DetailRow label="Email" value={selectedApp.email} /> 
                </dl>
              </div>
            </section>
            
            {/* Parent & Contact Section */}
            <section>
              <div className="bg-gray-800 text-white -mx-6 p-4 px-6">
                <h4 className="text-lg font-semibold">B. Parent & Contact Details</h4>
              </div>
              <div className="mt-4 border-b border-gray-200 pb-4">
                <dl className="divide-y divide-gray-200">
                  <DetailRow label="Father's Name" value={selectedApp.fatherName} />
                  <DetailRow label="Father's Occupation" value={selectedApp.fatherOccupation} />
                  <DetailRow label="Mother's Name" value={selectedApp.motherName} />
                  <DetailRow label="Mother's Occupation" value={selectedApp.motherOccupation} />
                  <DetailRow label="WhatsApp No." value={selectedApp.whatsappNo} />
                  <DetailRow label="Mobile No." value={selectedApp.mobileNo} />
                </dl>
              </div>
            </section>
            
            {/* Address Section */}
            <section>
              <div className="bg-gray-800 text-white -mx-6 p-4 px-6">
                <h4 className="text-lg font-semibold">C. Address Details</h4>
              </div>
              <div className="mt-4 border-b border-gray-200 pb-4">
                <dl className="divide-y divide-gray-200">
                  <DetailRow label="Village/Town/City" value={selectedApp.village} />
                  <DetailRow label="Post Office" value={selectedApp.postOffice} />
                  <DetailRow label="PIN Code" value={selectedApp.pinCode} />
                  <DetailRow label="District" value={selectedApp.district} />
                  <DetailRow label="State" value={selectedApp.state} />
                </dl>
              </div>
            </section>
            
            {/* Course & Centre Section */}
            <section>
              <div className="bg-gray-800 text-white -mx-6 p-4 px-6">
                <h4 className="text-lg font-semibold">D. Course & Centre Details</h4>
              </div>
              <div className="mt-4 border-b border-gray-200 pb-4">
                <dl className="divide-y divide-gray-200">
                  <DetailRow label="Session" value={selectedApp.session} />
                  <DetailRow label="Admission Class" value={selectedApp.admissionClass} />
                  <DetailRow label="Study Location" value={selectedApp.location} />
                  <DetailRow label="Exam Centre" value={selectedApp.examCentre} />
                  <DetailRow label="Info Source" value={selectedApp.infoSource} />
                </dl>
              </div>
            </section>
            
            {/* Documents Section */}
            <section>
              <div className="bg-gray-800 text-white -mx-6 p-4 px-6">
                <h4 className="text-lg font-semibold">E. Documents Attached</h4>
              </div>
              <div className="mt-4 flex space-x-4">
                <a href={selectedApp.photoURL || '#'} target="_blank" rel="noopener noreferrer" className={`p-4 border rounded-lg ${!selectedApp.photoURL && 'opacity-50 pointer-events-none'}`}>
                  <h5 className="font-semibold text-gray-700">Passport Photo</h5>
                  {selectedApp.photoURL ? <img src={selectedApp.photoURL} alt="Photo" className="w-32 h-40 object-cover mt-2" crossOrigin="anonymous" /> : <p className="text-sm text-gray-500">Not provided</p>}
                </a>
                <a href={selectedApp.signatureURL || '#'} target="_blank" rel="noopener noreferrer" className={`p-4 border rounded-lg ${!selectedApp.signatureURL && 'opacity-50 pointer-events-none'}`}>
                  <h5 className="font-semibold text-gray-700">Signature</h5>
                  {selectedApp.signatureURL ? <img src={selectedApp.signatureURL} alt="Signature" className="w-32 h-16 object-contain mt-2 bg-gray-100" crossOrigin="anonymous" /> : <p className="text-sm text-gray-500">Not provided</p>}
                </a>
              </div>
            </section>

          </div>
        )}
      </Modal>
    </>
  );
};

// --- NEW COMPONENT: Check Status / Admit Card ---
const CheckStatus = ({ setView }) => {
  const [appNumber, setAppNumber] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);
  const admitCardRef = useRef();
  
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setApplication(null);

    try {
      // Create a query to find the application
      const q = query(
        collection(db, "applications"),
        where("applicationNumber", "==", appNumber),
        where("dob", "==", dob)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("Application not found. Please check your Application Number and Date of Birth.");
      } else {
        // Should only be one
        const appData = querySnapshot.docs[0].data();
        setApplication({ id: querySnapshot.docs[0].id, ...appData });
      }
      
    } catch (err) {
      console.error("Error searching application: ", err);
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAdmitCard = () => {
    setLoading(true);
    const element = admitCardRef.current;
    const opt = {
      margin:       0.25, // Reduced margin
      filename:     `AdmitCard-${application.rollNumber}.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 2, useCORS: true, allowTaint: true, logging: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    if (!window.html2pdf) {
      alert("PDF library is not loaded. Please refresh.");
      setLoading(false);
      return;
    }

    window.html2pdf().from(element).set(opt).save().then(() => {
      setLoading(false);
    }).catch(err => {
      console.error("PDF generation failed:", err);
      setLoading(false);
    });
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 my-12">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Check Application Status</h1>
            <p className="text-gray-600">Download your Admit Card here once approved.</p>
          </div>
          <button
            onClick={() => setView('form')}
            className="flex items-center text-sm font-medium text-cyan-600 hover:text-cyan-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Form
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 p-6 border border-gray-200 rounded-md bg-gray-50">
          <FormInput 
            id="appNumber" 
            label="Application Number" 
            value={appNumber}
            onChange={(e) => setAppNumber(e.target.value)}
            placeholder="AS40-2025-..."
            required 
          />
          <FormInput 
            id="dob" 
            label="Date of Birth" 
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required 
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-400"
          >
            {loading ? <Spinner /> : 'Search Application'}
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
      </div>

      {application && (
        <div className="mt-8">
          {application.status === 'Approved' && (
            <>
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6">
                <h3 className="font-bold">Status: Approved</h3>
                <p>Congratulations, {application.studentName}! Your application is approved. Please download your admit card below.</p>
              </div>
              <button
                onClick={handleDownloadAdmitCard}
                disabled={loading}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {loading ? <Spinner /> : <Download className="w-5 h-5 mr-2" />}
                {loading ? 'Generating PDF...' : 'Download Admit Card'}
              </button>
              {/* --- FIX FOR BLANK PDF --- */}
              {/* This is now off-screen, not hidden, so html2pdf can see it */}
              <div style={{ position: 'absolute', left: '-9999px', zIndex: -1 }}>
                <AdmitCard ref={admitCardRef} app={application} />
              </div>
            </>
          )}
          
          {application.status === 'Pending' && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
              <h3 className="font-bold">Status: Pending</h3>
              <p>Hi, {application.studentName}. Your application is still under review. Please check back later.</p>
            </div>
          )}
          
          {application.status === 'Rejected' && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
              <h3 className="font-bold">Status: Rejected</h3>
              <p>Hi, {application.studentName}. We regret to inform you that your application could not be approved at this time. Please contact the admission office for further details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- NEW COMPONENT: Admit Card (for printing) ---
// --- RE-DESIGNED TO MATCH ad.pdf ---
const AdmitCard = React.forwardRef(({ app }, ref) => (
  // --- REMOVED p-8 ---
  <div ref={ref} className="bg-white">
    {/* --- ADDED MARGINS HERE --- */}
    <div className="border-2 border-gray-800 m-8">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b-2 border-gray-400">
        <div className="flex items-center">
          <svg className="h-16 w-auto text-cyan-600" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <div className="ml-2">
            <h1 className="text-2xl font-bold text-cyan-800">Ajmal Super 40</h1>
            <p className="text-sm text-gray-600">For the greater good</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-cyan-700">Admit Card</h1>
          <p className="text-md text-gray-700">Entrance Test {new Date(app.examDate).getFullYear()}</p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-4 flex">
        {/* Left Side: Details */}
        <div className="w-3/4 pr-4 border-r border-gray-300">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2"><strong className="text-gray-600 text-sm block">Name:</strong> <span className="text-lg font-semibold">{app.studentName}</span></div>
            <div><strong className="text-gray-600 text-sm block">Roll Number:</strong> <span className="text-lg font-semibold">{app.rollNumber}</span></div>
            <div><strong className="text-gray-600 text-sm block">Application No:</strong> <span className="text-lg">{app.applicationNumber}</span></div>
            <div><strong className="text-gray-600 text-sm block">Date of Birth:</strong> <span className="text-lg">{app.dob}</span></div>
            <div><strong className="text-gray-600 text-sm block">Gender:</strong> <span className="text-lg">{app.gender}</span></div>
          </div>
          
          {/* Test Day Details */}
          <div className="mt-4 border-t border-gray-300 pt-4">
            <h3 className="text-lg font-semibold text-cyan-800 mb-2">Test Day Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div><strong className="text-gray-600 text-sm block">Date of Test:</strong> <span className="text-lg">{app.examDate}</span></div>
              <div><strong className="text-gray-600 text-sm block">Reporting Time:</strong> <span className="text-lg">09:00 AM</span></div>
              <div><strong className="text-gray-600 text-sm block">Gate Closure:</strong> <span className="text-lg">09:45 AM</span></div>
              <div><strong className="text-gray-600 text-sm block">Exam Duration:</strong> <span className="text-lg">{app.examTime}</span></div>
            </div>
          </div>
          
          {/* Test Center Details */}
          <div className="mt-4 border-t border-gray-300 pt-4">
            <h3 className="text-lg font-semibold text-cyan-800 mb-2">Test Center Details</h3>
            <div className="space-y-2">
              <div><strong className="text-gray-600 text-sm block">Test City:</strong> <span className="text-lg">{app.district}</span></div>
              <div><strong className="text-gray-600 text-sm block">Test Center Name:</strong> <span className="text-lg">{app.examCentre}</span></div>
              <div><strong className="text-gray-600 text-sm block">Test Center Address:</strong> <span className="text-lg">{app.examCentre} - Full address will be updated here.</span></div>
            </div>
          </div>

        </div>
        
        {/* Right Side: Photo & Sign */}
        <div className="w-1/4 pl-4 flex flex-col items-center">
          {app.photoURL ? 
            <img src={app.photoURL} alt="Passport Photo" className="w-32 h-40 object-cover border-2 border-gray-300" crossOrigin="anonymous" /> : 
            <div className="w-32 h-40 border-2 border-dashed flex items-center justify-center text-gray-500 p-2 text-center text-sm">No Photo Provided</div>
          }
          <p className="text-xs text-gray-500 mt-1">Passport Photo</p>
          
          {app.signatureURL ? 
            <img src={app.signatureURL} alt="Signature" className="w-40 h-16 object-contain border-2 border-gray-300 mt-6" crossOrigin="anonymous" /> : 
            <div className="w-40 h-16 border-2 border-dashed flex items-center justify-center text-gray-500 mt-6 p-2 text-center text-sm">No Signature Provided</div>
          }
          <div className="w-40 border-t border-gray-400 mt-1 pt-1 text-center text-xs text-gray-600">Candidate's Signature</div>
        </div>
      </div>
      
      {/* Signatures */}
      <div className="p-4 flex justify-between items-end mt-12 border-t border-gray-300">
        <div className="text-center">
          <div className="w-48 h-16 border-b border-gray-400"></div>
          <p className="font-semibold mt-2 text-sm">Candidate's Signature</p>
          <p className="text-xs text-gray-500">(In presence of Invigilator)</p>
        </div>
        <div className="text-center">
          <div className="w-48 h-16 border-b border-gray-400"></div>
          <p className="font-semibold mt-2 text-sm">Invigilator's Signature</p>
          <p className="text-xs text-gray-500">(After verification)</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 border-t-2 border-gray-400 mt-4">
        <h3 className="text-lg font-bold text-cyan-800 mb-2">Instructions for Candidate</h3>
        <ul className="list-decimal list-inside text-xs text-gray-700 space-y-1">
          <li>Candidates should bring the admit card along with any one of the following valid photo ID proof (Aadhaar Card, Voter ID Card, PAN Card, Passport, Driving License).</li>
          <li>The admit card with original ID card is valid only on the exam date and time.</li>
          <li>Candidates will not be allowed to enter the test center after the gate closure time (09:45 AM).</li>
          <li>Possession and use of electronic devices (phones, smart watches, calculators) are strictly prohibited inside the test center.</li>
          <li>Rough sheets and pen will be provided to the candidates inside the examination lab.</li>
          <li>Please submit the admit card and rough sheets to the invigilator after the exam.</li>
        </ul>
      </div>

    </div>
  </div>
));


// Main App Component (Router)
export default function App() {
  const [view, setView] = useState('form'); // 'form', 'login', 'success', 'checkStatus'
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  
  // Auth listener
  useEffect(() => {
    const signInPublicUser = async () => {
      // Check if keys are just placeholders
      if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        setAuthError("Firebase config not found. Using placeholders. Please set up your .env.local file.");
        setAuthLoading(false);
        return;
      }
      
      try {
        if (auth.currentUser) {
          // User is already signed in (likely from a previous session or token)
          if (auth.currentUser.isAnonymous) {
            setUser({ uid: auth.currentUser.uid, isAnonymous: true });
          } else {
            setUser({ uid: auth.currentUser.uid, email: auth.currentUser.email, isAnonymous: false });
            setView('dashboard');
          }
          setAuthLoading(false);
        } else {
          // No user, sign in anonymously
          const userCredential = await signInAnonymously(auth);
          setUser({ uid: userCredential.user.uid, isAnonymous: true });
          console.log("Anonymous user signed in:", userCredential.user.uid);
          setAuthLoading(false);
        }
      } catch (e) {
        console.error("Error signing in anonymously:", e);
        if (e.code === 'auth/api-key-not-valid') {
          setAuthError("Firebase config not found. Using placeholders. Please set up your .env.local file.");
        } else {
          setAuthError("Failed to connect to the service. Please refresh.");
        }
        setAuthLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        if (user.isAnonymous) {
          setUser({ uid: user.uid, isAnonymous: true });
        } else {
          // This is our Admin
          setUser({ uid: user.uid, email: user.email, isAnonymous: false });
          setView('dashboard'); // Automatically go to dashboard if admin logs in
        }
        setAuthLoading(false);
      } else {
        // User is signed out, sign them in anonymously for form submission
        setUser(null);
        if (view !== 'login' && view !== 'checkStatus') {
          setView('form');
        }
        await signInPublicUser();
      }
    });
    
    // Custom token sign-in (Canvas specific)
    const signInWithToken = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined') {
          await signInWithCustomToken(auth, __initial_auth_token);
          // onAuthStateChanged will handle the rest
        } else {
          // No token, ensure anonymous sign-in
          await signInPublicUser();
        }
      } catch (e) {
        console.error("Custom token sign-in failed:", e);
        setAuthError("Failed to authenticate. Please refresh.");
        setAuthLoading(false);
      }
    };

    // Only run auth logic if keys are present
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
      signInWithToken();
    } else {
      setAuthError("Firebase config not found. Please set up your .env.local file.");
      setAuthLoading(false);
    }

    return () => {
      if(unsubscribe) unsubscribe();
    };
  }, []); // Only run on mount
  
  const handleLogout = async () => {
    const oldUid = user?.uid; // Get admin UID
    await signOut(auth);
    setUser(null);
    setView('form');
    // After admin logs out, anonymous user is signed back in by onAuthStateChanged
    console.log(`Admin ${oldUid} signed out.`);
  };
  
  // Main Render
  const renderView = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen-nonav">
          <Spinner white={false} />
          <span className="ml-2 text-gray-600">Connecting to service...</span>
        </div>
      );
    }
    
    if (authError && !user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen-nonav text-center p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Connection Error</h2>
          <p className="text-gray-600 mt-2">{authError}</p>
          <p className="text-gray-600 mt-1">Please refresh the page.</p>
        </div>
      );
    }
    
    // If user is an admin, always show dashboard
    if (user && !user.isAnonymous) {
      return <AdminDashboard />;
    }

    // Otherwise, show view based on state
    switch (view) {
      case 'form':
        return <StudentApplicationForm setView={setView} setSubmittedData={setSubmittedData} />;
      case 'login':
        return <AdminLogin setView={setView} setAuthError={setAuthError} />;
      case 'success':
        return <SubmissionSuccess data={submittedData} setView={setView} />;
      case 'checkStatus':
        return <CheckStatus setView={setView} />;
      case 'dashboard': // Should be caught by user check, but as a fallback
        return <AdminLogin setView={setView} setAuthError={setAuthError} />; // Force login
      default:
        return <StudentApplicationForm setView={setView} setSubmittedData={setSubmittedData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        user={user && !user.isAnonymous ? user : null}
        onLoginClick={() => setView('login')}
        onLogoutClick={handleLogout}
      />
      <main>
        {renderView()}
      </main>
    </div>
  );
}

