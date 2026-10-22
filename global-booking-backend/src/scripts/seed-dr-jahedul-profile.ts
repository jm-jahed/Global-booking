import { mongoAdapter } from "../infrastructure/database/mongo.adapter.js";

async function main() {
  await mongoAdapter.connect();
  const col = mongoAdapter.getDoctorCollection();

  const updateData = {
    fullName: "Dr Jahedul Islam",
    slug: "dr-jahedul-islam",
    specialty: "Cardiology",
    customTitle: "Consultant Interventional Cardiologist",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
    yearsOfExperience: 12,
    medicalDegrees: ["MBBS", "MD (Cardiology)", "FRCP (London)", "FESC", "FACC"],
    bio: "Dr. Jahedul Islam is an acclaimed Consultant Interventional Cardiologist specializing in complex coronary interventions, transradial angiography, and preventive cardiac wellness. With over a decade of dedicated clinical practice across premier international tertiary cardiac centers, Dr. Islam provides patient-centered, compassionate care combining evidence-based medicine with modern clinical technologies.",
    consultationFee: { amountInFils: 50000, currency: "AED" as const, formatted: "AED 500.00" },
    chamberLocationsSummary: "Medcare Heart Centre, Dubai Healthcare City",
    languages: ["English", "Arabic", "Bengali"],
    isPublished: true,
    chambers: [
      {
        id: "CH-1",
        facilityName: "Medcare Heart Centre",
        city: "Dubai Healthcare City",
        roomNumber: "Suite 302, 3rd Floor",
        visitingSchedule: "Mon - Thu: 5:00 PM - 9:00 PM",
        contactPhone: "+971 4 377 2000",
      },
    ],
    services: [
      {
        id: "SRV-1",
        title: "Comprehensive Cardiac Evaluation",
        category: "Diagnostic & Clinical Care",
        description: "Thorough clinical examination, chest pain assessment, ECG interpretation, hypertension control, and individualized cardiac management plans.",
      },
      {
        id: "SRV-2",
        title: "Coronary Angiography & Stenting",
        category: "Interventional Cardiology",
        description: "Minimally invasive transradial coronary catheterization, fractional flow reserve (FFR) assessment, and precision drug-eluting stent implantation.",
      },
      {
        id: "SRV-3",
        title: "Echocardiography & Cardiac Imaging",
        category: "Non-Invasive Diagnostics",
        description: "High-resolution transthoracic 2D/Doppler echocardiography evaluating myocardial wall motion, valvular function, and cardiac hemodynamics.",
      },
      {
        id: "SRV-4",
        title: "Preventive Cardiovascular Screening",
        category: "Preventive Health",
        description: "Advanced lipid panel analysis, cardiovascular risk scoring, coronary artery calcium score guidance, and lifestyle counseling.",
      },
    ],
    education: [
      {
        id: "EDU-1",
        degree: "MBBS — Bachelor of Medicine, Bachelor of Surgery",
        institution: "Dhaka Medical College & Hospital",
        graduationYear: "2010",
        fieldOfStudy: "Medicine & Surgery",
      },
      {
        id: "EDU-2",
        degree: "MD in Cardiology",
        institution: "National Institute of Cardiovascular Diseases (NICVD)",
        graduationYear: "2015",
        fieldOfStudy: "Cardiovascular Diseases",
      },
      {
        id: "EDU-3",
        degree: "FRCP — Fellow of the Royal College of Physicians",
        institution: "Royal College of Physicians, Edinburgh / London",
        graduationYear: "2019",
        fieldOfStudy: "Cardiology & Internal Medicine",
      },
    ],
    experience: [
      {
        id: "EXP-1",
        role: "Consultant Interventional Cardiologist",
        organization: "Mediclinic City Hospital",
        department: "Cardiology & Interventional Suite",
        startYear: "2021",
        isCurrent: true,
      },
      {
        id: "EXP-2",
        role: "Specialist Cardiologist",
        organization: "Medcare Heart Centre",
        department: "Department of Cardiology",
        startYear: "2018",
        endYear: "2021",
        isCurrent: false,
      },
      {
        id: "EXP-3",
        role: "Clinical Fellow in Cardiology",
        organization: "National Institute of Cardiovascular Diseases",
        department: "Coronary Care Unit & Cath Lab",
        startYear: "2013",
        endYear: "2017",
        isCurrent: false,
      },
    ],
    awards: [
      {
        id: "AWD-1",
        title: "Excellence in Clinical Cardiology & Patient Outcomes",
        issuingBody: "Emirates Healthcare Excellence Awards",
        year: "2023",
        description: "Recognized for clinical distinction and exceptional patient outcomes in interventional cardiology.",
      },
      {
        id: "AWD-2",
        title: "Distinguished Investigator in Cardiovascular Sciences",
        issuingBody: "Asian-Pacific Society of Cardiology",
        year: "2020",
        description: "Awarded for published research on transradial coronary interventions.",
      },
    ],
    publications: [
      {
        id: "PUB-1",
        title: "Clinical Outcomes of Transradial Percutaneous Coronary Intervention in Acute Coronary Syndrome",
        journal: "Journal of the American College of Cardiology (JACC) Interventions",
        year: "2022",
        url: "https://pubmed.ncbi.nlm.nih.gov",
      },
      {
        id: "PUB-2",
        title: "Early Risk Stratification and Biomarkers in Premature Coronary Artery Disease",
        journal: "European Heart Journal — Cardiovascular Pharmacotherapy",
        year: "2020",
        url: "https://academic.oup.com/eurheartj",
      },
    ],
    memberships: [
      {
        id: "MEM-1",
        organizationName: "European Society of Cardiology (ESC)",
        role: "Fellow (FESC)",
        sinceYear: "2018",
      },
      {
        id: "MEM-2",
        organizationName: "American College of Cardiology (ACC)",
        role: "Fellow (FACC)",
        sinceYear: "2021",
      },
      {
        id: "MEM-3",
        organizationName: "Emirates Cardiac Society",
        role: "Active Member",
        sinceYear: "2019",
      },
    ],
    publicContact: {
      clinicPhone: "+971 4 435 9999",
      inquiryWhatsApp: "+971 50 123 4567",
      publicEmail: "dr.jahedul.cardiology@booking.com",
    },
    publicDocuments: [
      {
        id: "DOC-1",
        title: "DHA Specialist Cardiology License",
        documentType: "Medical License",
        url: "https://example.com/licenses/dha-specialist-cardiology.pdf",
      },
      {
        id: "DOC-2",
        title: "FRCP Fellowship Credential",
        documentType: "Board Fellowship",
        url: "https://example.com/credentials/frcp-diploma.pdf",
      },
    ],
    portfolioSections: {
      hero: { isVisible: true, customTitle: "Better care for your health" },
      about: { isVisible: true, customTitle: "Dedicated Cardiology Practice" },
      services: { isVisible: true, customTitle: "Comprehensive Clinical Care" },
      education: { isVisible: true, customTitle: "Academic Qualifications & Degrees" },
      experience: { isVisible: true, customTitle: "Clinical Appointments & Experience" },
      awards: { isVisible: true, customTitle: "Awards & Honors" },
      publications: { isVisible: true, customTitle: "Publications & Clinical Research" },
      memberships: { isVisible: true, customTitle: "Professional Societies & Fellowships" },
      chambers: { isVisible: true, customTitle: "Chamber & Visiting Schedule" },
      contact: { isVisible: true, customTitle: "Contact & Inquiries" },
    },
    updatedAt: new Date().toISOString(),
  };

  const res = await col.updateOne({ id: "ACC-DOC-705357" }, { $set: updateData });
  console.log("Dr Jahedul Islam profile updated successfully in MongoDB:", res);
  await mongoAdapter.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
