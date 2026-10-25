import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";

test("Public Doctor API (GET /api/v1/public/doctors/:slug) - Security, Publishing & Privacy Tests", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const activePublishedDoctor: DoctorRecord = {
    id: "ACC-DOC-8001",
    doctorId: "DOC-8001",
    fullName: "Dr. Sarah Khan",
    slug: "dr-sarah-khan",
    customTitle: "Consultant Interventional Cardiologist",
    email: "sarah.private@globalbooking.ae",
    phone: "+971 50 999 8888",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Cardiology",
    licenseNumber: "DHA-DOC-88990",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-8001",
    assignedPatientCount: 25,
    totalBookingsCount: 88,
    chamberLocationsSummary: "Mediclinic City Hospital, Dubai",
    yearsOfExperience: 14,
    medicalDegrees: ["MBBS", "MD", "FRCP"],
    consultationFee: {
      amountInFils: 50000,
      currency: "AED",
      formatted: "500.00",
    },
    bio: "Senior cardiovascular physician specializing in complex coronary interventions.",
    languages: ["English", "Arabic"],
    isPublished: true,
    chambers: [
      {
        id: "CH-1",
        facilityName: "Mediclinic City Hospital",
        city: "Dubai",
        roomNumber: "Room 402 - Private Suite", // PRIVATE FIELD: must be stripped
        visitingSchedule: "Mon - Thu: 5:00 PM - 9:00 PM",
        contactPhone: "+971 4 435 9999", // PRIVATE FIELD: must be stripped
        timezone: "Asia/Dubai",
      },
    ],
    passwordHash: "$2b$12$super_secret_hash_value_never_expose",
    invitationTokenHash: "sha256_invitation_hash_never_expose",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const doctorWithFullPortfolio: DoctorRecord = {
    id: "ACC-DOC-9001",
    doctorId: "DOC-9001",
    fullName: "Dr. Marcus Vance",
    slug: "dr-marcus-vance",
    customTitle: "Chief Consultant Neurosurgeon",
    email: "marcus.private@vance-clinic.ae", // strictly private
    phone: "+971 50 111 2222", // strictly private
    avatar: "https://example.com/marcus.jpg",
    specialty: "Neurosurgery",
    licenseNumber: "DHA-DOC-99887", // strictly private
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9001",
    assignedPatientCount: 45,
    totalBookingsCount: 120,
    chamberLocationsSummary: "American Hospital Dubai, Neuro Tower",
    yearsOfExperience: 18,
    medicalDegrees: ["MBBS", "MD", "FRCS (Neurosurgery)"],
    consultationFee: {
      amountInFils: 75000,
      currency: "AED",
      formatted: "750.00",
    },
    bio: "Senior cranial and spinal neurosurgeon specializing in minimally invasive neuro-endoscopy.",
    languages: ["English", "French"],
    isPublished: true,
    chambers: [
      {
        id: "CH-VANCE-1",
        facilityName: "American Hospital Dubai",
        city: "Dubai",
        roomNumber: "Suite 705 - Private Clinic", // PRIVATE: must be stripped
        visitingSchedule: "Sun - Wed: 4:00 PM - 8:00 PM",
        contactPhone: "+971 4 377 5555", // PRIVATE: must be stripped
      },
    ],
    education: [
      {
        id: "EDU-1",
        degree: "MBBS",
        institution: "Imperial College London",
        graduationYear: "2006",
        fieldOfStudy: "Medicine & Surgery",
      },
      {
        id: "EDU-2",
        degree: "FRCS (Neurosurgery)",
        institution: "Royal College of Surgeons of England",
        graduationYear: "2012",
      },
    ],
    experience: [
      {
        id: "EXP-1",
        role: "Chief of Neurosurgery",
        organization: "American Hospital Dubai",
        department: "Neurosciences",
        startYear: "2018",
        isCurrent: true,
      },
      {
        id: "EXP-2",
        role: "Senior Consultant",
        organization: "National Hospital for Neurology and Neurosurgery",
        department: "Cranial Surgery",
        startYear: "2012",
        endYear: "2018",
        isCurrent: false,
      },
    ],
    services: [
      {
        id: "SRV-1",
        title: "Minimally Invasive Spine Surgery",
        description: "Targeted endoscopic decompression for herniated discs.",
        category: "Spine Care",
      },
      {
        id: "SRV-2",
        title: "Cranial Tumor Resection",
        description: "Image-guided micro-neurosurgical excision of skull base tumors.",
        category: "Cranial Surgery",
      },
    ],
    awards: [
      {
        id: "AWD-1",
        title: "Excellence in Surgical Innovation",
        issuingBody: "Emirates Neuroscience Society",
        year: "2023",
        description: "Awarded for groundbreaking intraoperative navigation techniques.",
      },
    ],
    publications: [
      {
        id: "PUB-1",
        title: "Long-term Outcomes of Endoscopic Endonasal Pituitary Surgery",
        journal: "Journal of Neurosurgery",
        year: "2021",
        url: "https://example.com/pub/endonasal-2021",
        abstract: "Comprehensive 10-year multi-center review of 520 consecutive procedures.",
      },
    ],
    memberships: [
      {
        id: "MEM-1",
        organizationName: "World Federation of Neurosurgical Societies (WFNS)",
        role: "Active Member",
        sinceYear: "2014",
      },
    ],
    publicContact: {
      clinicPhone: "+971 4 555 1234",
      inquiryWhatsApp: "+971 50 888 7777",
      publicEmail: "appointments@vance-neuro.ae",
    },
    portfolioSections: {
      about: { isVisible: true, order: 1, customTitle: "About Dr. Vance" },
      qualifications: { isVisible: true, order: 2, customTitle: "Education & Credentials" },
      services: { isVisible: true, order: 3 },
      experience: { isVisible: true, order: 4 },
      publications: { isVisible: true, order: 5 },
      awards: { isVisible: true, order: 6 },
      contact: { isVisible: true, order: 7 },
    },
    publicDocuments: [
      {
        id: "DOC-REF-1",
        title: "Fellowship Certificate in Skull Base Surgery",
        documentType: "FELLOWSHIP_CERTIFICATE",
        url: "https://example.com/certificates/vance-fellowship.pdf",
      },
    ],
    passwordHash: "$2b$12$super_secret_hash_value_never_expose",
    invitationTokenHash: "sha256_invitation_hash_never_expose",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const doctorWithMinimalProfile: DoctorRecord = {
    id: "ACC-DOC-9002",
    doctorId: "DOC-9002",
    fullName: "Dr. Elena Rostova",
    slug: "dr-elena-rostova",
    email: "elena.private@hospital.ae",
    phone: "+971 50 333 4444",
    avatar: "https://example.com/elena.jpg",
    specialty: "General Practice",
    licenseNumber: "DHA-DOC-11223",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9002",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "",
    yearsOfExperience: 5,
    medicalDegrees: ["MBBS"],
    consultationFee: {
      amountInFils: 25000,
      currency: "AED",
      formatted: "250.00",
    },
    isPublished: true,
    passwordHash: "$2b$12$super_secret_hash_value_never_expose",
    invitationTokenHash: "sha256_invitation_hash_never_expose",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const unpublishedDoctorExplicitFalse: DoctorRecord = {
    ...activePublishedDoctor,
    id: "ACC-DOC-8002",
    doctorId: "DOC-8002",
    slug: "dr-unpublished-false",
    isPublished: false,
  };

  // Doctor with isPublished: undefined (unmigrated / newly created doctor)
  const unpublishedDoctorUndefined: any = {
    ...activePublishedDoctor,
    id: "ACC-DOC-8003",
    doctorId: "DOC-8003",
    slug: "dr-unpublished-undefined",
    isPublished: undefined,
  };

  const suspendedDoctor: DoctorRecord = {
    ...activePublishedDoctor,
    id: "ACC-DOC-8004",
    doctorId: "DOC-8004",
    slug: "dr-suspended",
    accountStatus: "SUSPENDED",
    isPublished: true,
  };

  const pendingDoctor: DoctorRecord = {
    ...activePublishedDoctor,
    id: "ACC-DOC-8005",
    doctorId: "DOC-8005",
    slug: "dr-pending",
    accountStatus: "PENDING_APPROVAL",
    isPublished: true,
  };

  const rejectedDoctor: DoctorRecord = {
    ...activePublishedDoctor,
    id: "ACC-DOC-8006",
    doctorId: "DOC-8006",
    slug: "dr-rejected",
    accountStatus: "REJECTED",
    isPublished: true,
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      const records: any[] = [
        activePublishedDoctor,
        doctorWithFullPortfolio,
        doctorWithMinimalProfile,
        unpublishedDoctorExplicitFalse,
        unpublishedDoctorUndefined,
        suspendedDoctor,
        pendingDoctor,
        rejectedDoctor,
      ];

      const matched = records.find((rec) => {
        if (query.slug && rec.slug !== query.slug) return false;
        // Require isPublished === true in query
        if (query.isPublished === true && rec.isPublished !== true) return false;
        if (query.accountStatus?.$in && !query.accountStatus.$in.includes(rec.accountStatus)) {
          return false;
        }
        return true;
      });

      return matched ? { ...matched } : null;
    },
    updateOne: async () => ({ acknowledged: true, modifiedCount: 1 }),
  });

  try {
    // 1. Success case: Active, published doctor matching public slug
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-sarah-khan",
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.statusCode, 200);
    const doc = body.doctor;

    // Verify approved public fields are present
    assert.equal(doc.fullName, "Dr. Sarah Khan");
    assert.equal(doc.slug, "dr-sarah-khan");
    assert.equal(doc.customTitle, "Consultant Interventional Cardiologist");
    assert.equal(doc.specialty, "Cardiology");
    assert.equal(doc.avatar, "https://example.com/avatar.jpg");
    assert.deepEqual(doc.medicalDegrees, ["MBBS", "MD", "FRCP"]);
    assert.equal(doc.yearsOfExperience, 14);
    assert.equal(doc.bio, "Senior cardiovascular physician specializing in complex coronary interventions.");
    assert.deepEqual(doc.languages, ["English", "Arabic"]);
    assert.equal(doc.consultationFee.formatted, "500.00");
    assert.equal(doc.isPublished, true);

    // Verify sanitized chamber fields (facilityName, city, visitingSchedule)
    assert.equal(doc.chambers.length, 1);
    assert.equal(doc.chambers[0].facilityName, "Mediclinic City Hospital");
    assert.equal(doc.chambers[0].city, "Dubai");
    assert.equal(doc.chambers[0].visitingSchedule, "Mon - Thu: 5:00 PM - 9:00 PM");

    // CRITICAL PRIVACY CHECKS: Verify NO private or sensitive information is leaked
    assert.equal(doc.email, undefined);
    assert.equal(doc.phone, undefined);
    assert.equal(doc.licenseNumber, undefined);
    assert.equal(doc.passwordHash, undefined);
    assert.equal(doc.invitationTokenHash, undefined);
    assert.equal(doc.invitationTokenExpiresAt, undefined);
    assert.equal(doc.id, undefined);
    assert.equal(doc.doctorId, undefined);
    assert.equal(doc._id, undefined);
    assert.equal(doc.subscriptionId, undefined);
    assert.equal(doc.assignedPatientCount, undefined);
    assert.equal(doc.totalBookingsCount, undefined);
    assert.equal(doc.documents, undefined);
    // Private chamber details omitted:
    assert.equal(doc.chambers[0].roomNumber, undefined);
    assert.equal(doc.chambers[0].contactPhone, undefined);

    // 2. Comprehensive Portfolio Whitelist Test (All genuine sections populated)
    const fullRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-marcus-vance",
    });
    assert.equal(fullRes.statusCode, 200);
    const fullDoc = JSON.parse(fullRes.body).doctor;

    // Verify Education
    assert.equal(Array.isArray(fullDoc.education), true);
    assert.equal(fullDoc.education.length, 2);
    assert.equal(fullDoc.education[0].degree, "MBBS");
    assert.equal(fullDoc.education[0].institution, "Imperial College London");
    assert.equal(fullDoc.education[0].graduationYear, "2006");
    assert.equal(fullDoc.education[0].fieldOfStudy, "Medicine & Surgery");
    assert.equal(fullDoc.education[1].degree, "FRCS (Neurosurgery)");
    assert.equal(fullDoc.education[1].institution, "Royal College of Surgeons of England");

    // Verify Professional Experience
    assert.equal(Array.isArray(fullDoc.experience), true);
    assert.equal(fullDoc.experience.length, 2);
    assert.equal(fullDoc.experience[0].role, "Chief of Neurosurgery");
    assert.equal(fullDoc.experience[0].organization, "American Hospital Dubai");
    assert.equal(fullDoc.experience[0].department, "Neurosciences");
    assert.equal(fullDoc.experience[0].startYear, "2018");
    assert.equal(fullDoc.experience[0].isCurrent, true);
    assert.equal(fullDoc.experience[1].role, "Senior Consultant");
    assert.equal(fullDoc.experience[1].endYear, "2018");
    assert.equal(fullDoc.experience[1].isCurrent, false);

    // Verify Services
    assert.equal(Array.isArray(fullDoc.services), true);
    assert.equal(fullDoc.services.length, 2);
    assert.equal(fullDoc.services[0].title, "Minimally Invasive Spine Surgery");
    assert.equal(fullDoc.services[0].category, "Spine Care");
    assert.equal(fullDoc.services[1].title, "Cranial Tumor Resection");

    // Verify Awards
    assert.equal(Array.isArray(fullDoc.awards), true);
    assert.equal(fullDoc.awards.length, 1);
    assert.equal(fullDoc.awards[0].title, "Excellence in Surgical Innovation");
    assert.equal(fullDoc.awards[0].issuingBody, "Emirates Neuroscience Society");
    assert.equal(fullDoc.awards[0].year, "2023");

    // Verify Publications
    assert.equal(Array.isArray(fullDoc.publications), true);
    assert.equal(fullDoc.publications.length, 1);
    assert.equal(fullDoc.publications[0].title, "Long-term Outcomes of Endoscopic Endonasal Pituitary Surgery");
    assert.equal(fullDoc.publications[0].journal, "Journal of Neurosurgery");
    assert.equal(fullDoc.publications[0].year, "2021");
    assert.equal(fullDoc.publications[0].url, "https://example.com/pub/endonasal-2021");

    // Verify Memberships
    assert.equal(Array.isArray(fullDoc.memberships), true);
    assert.equal(fullDoc.memberships.length, 1);
    assert.equal(fullDoc.memberships[0].organizationName, "World Federation of Neurosurgical Societies (WFNS)");
    assert.equal(fullDoc.memberships[0].role, "Active Member");

    // Verify Public Contact (Explicitly configured public patient contact)
    assert.ok(fullDoc.publicContact);
    assert.equal(fullDoc.publicContact.clinicPhone, "+971 4 555 1234");
    assert.equal(fullDoc.publicContact.inquiryWhatsApp, "+971 50 888 7777");
    assert.equal(fullDoc.publicContact.publicEmail, "appointments@vance-neuro.ae");
    // Verify private account phone & email NEVER leaked into public response
    assert.notEqual(fullDoc.publicContact.publicEmail, "marcus.private@vance-clinic.ae");
    assert.equal(fullDoc.email, undefined);
    assert.equal(fullDoc.phone, undefined);

    // Verify Portfolio Section Settings
    assert.ok(fullDoc.portfolioSections);
    assert.equal(fullDoc.portfolioSections.about.isVisible, true);
    assert.equal(fullDoc.portfolioSections.about.order, 1);
    assert.equal(fullDoc.portfolioSections.about.customTitle, "About Dr. Vance");
    assert.equal(fullDoc.portfolioSections.qualifications.customTitle, "Education & Credentials");

    // Verify Public Documents
    assert.equal(Array.isArray(fullDoc.publicDocuments), true);
    assert.equal(fullDoc.publicDocuments.length, 1);
    assert.equal(fullDoc.publicDocuments[0].title, "Fellowship Certificate in Skull Base Surgery");
    assert.equal(fullDoc.publicDocuments[0].url, "https://example.com/certificates/vance-fellowship.pdf");

    // 3. ZERO FAKE DATA POLICY: Missing Optional Fields Must Be Omitted (Never Defaulted / Fabricated)
    const minRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-elena-rostova",
    });
    assert.equal(minRes.statusCode, 200);
    const minDoc = JSON.parse(minRes.body).doctor;

    // Verify core fields present
    assert.equal(minDoc.fullName, "Dr. Elena Rostova");
    assert.equal(minDoc.specialty, "General Practice");
    assert.deepEqual(minDoc.medicalDegrees, ["MBBS"]);
    assert.equal(minDoc.yearsOfExperience, 5);

    // STRICT ZERO FAKE DATA: verify all unpopulated optional fields are completely omitted
    assert.equal(minDoc.customTitle, undefined);
    assert.equal(minDoc.bio, undefined);
    assert.equal(minDoc.languages, undefined);
    assert.equal(minDoc.chamberLocationsSummary, undefined);
    assert.equal(minDoc.chambers, undefined);
    assert.equal(minDoc.education, undefined);
    assert.equal(minDoc.experience, undefined);
    assert.equal(minDoc.services, undefined);
    assert.equal(minDoc.awards, undefined);
    assert.equal(minDoc.publications, undefined);
    assert.equal(minDoc.memberships, undefined);
    assert.equal(minDoc.publicContact, undefined);
    assert.equal(minDoc.portfolioSections, undefined);
    assert.equal(minDoc.publicDocuments, undefined);

    // Private fields never present on minimal profile either
    assert.equal(minDoc.email, undefined);
    assert.equal(minDoc.phone, undefined);
    assert.equal(minDoc.licenseNumber, undefined);
    assert.equal(minDoc.passwordHash, undefined);
    assert.equal(minDoc.id, undefined);

    // 4. Doctor with isPublished: false returns 404
    const unpubFalseRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-unpublished-false",
    });
    assert.equal(unpubFalseRes.statusCode, 404);
    const unpubFalseBody = JSON.parse(unpubFalseRes.body);
    assert.equal(unpubFalseBody.error, "Not Found");

    // 5. Doctor with isPublished: undefined (unmigrated) returns 404
    const unpubUndefRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-unpublished-undefined",
    });
    assert.equal(unpubUndefRes.statusCode, 404);
    const unpubUndefBody = JSON.parse(unpubUndefRes.body);
    assert.equal(unpubUndefBody.error, "Not Found");

    // 6. Suspended doctor returns 404 even if isPublished: true
    const suspRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-suspended",
    });
    assert.equal(suspRes.statusCode, 404);

    // 7. Pending doctor returns 404 even if isPublished: true
    const pendRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-pending",
    });
    assert.equal(pendRes.statusCode, 404);

    // 8. Rejected doctor returns 404 even if isPublished: true
    const rejRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-rejected",
    });
    assert.equal(rejRes.statusCode, 404);

    // 9. Internal doctorId (DOC-8001 or doc-8001) does NOT work as public slug (returns 404)
    const docIdRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/doc-8001",
    });
    assert.equal(docIdRes.statusCode, 404);

    // 10. Nonexistent doctor returns 404
    const notFoundRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/dr-nonexistent-999",
    });
    assert.equal(notFoundRes.statusCode, 404);

    // 11. Invalid slug format returns 404 safely
    const invalidRes = await app.inject({
      method: "GET",
      url: "/api/v1/public/doctors/INVALID_CAPS_AND_SPACES!",
    });
    assert.equal(invalidRes.statusCode, 404);

    // 12. POST /api/v1/public/doctors/:slug/book validates inputs
    const badBookRes = await app.inject({
      method: "POST",
      url: "/api/v1/public/doctors/dr-sarah-khan/book",
      payload: {
        patientName: "",
        patientPhone: "",
      },
    });
    assert.equal(badBookRes.statusCode, 400);

    // 13. POST /api/v1/public/doctors/:slug/book: Successfully issues real queue ticket
    const originalGetQueueTicketCol = mongoAdapter.getQueueTicketCollection.bind(mongoAdapter);
    const originalGetQueueCounterCol = mongoAdapter.getQueueCounterCollection.bind(mongoAdapter);
    const mockTickets: any[] = [];
    let counterVal = 0;

    (mongoAdapter as any).getQueueTicketCollection = () => ({
      findOne: async (q: any) => mockTickets.find((t) => t.idempotencyKey && t.idempotencyKey === q.idempotencyKey) || null,
      insertOne: async (doc: any) => {
        mockTickets.push(doc);
        return { acknowledged: true, insertedId: doc.id };
      },
      find: (q: any) => ({
        sort: () => ({
          toArray: async () => mockTickets.filter((t) => !q.status || t.status === q.status),
        }),
      }),
    });

    (mongoAdapter as any).getQueueCounterCollection = () => ({
      findOneAndUpdate: async () => {
        counterVal++;
        return { lastSerial: counterVal };
      },
    });

    try {
      const bookRes = await app.inject({
        method: "POST",
        url: "/api/v1/public/doctors/dr-sarah-khan/book",
        payload: {
          patientName: "Tariq Mansoor",
          patientPhone: "+971501112233",
          service: "Cardiology Consultation",
        },
      });
      assert.equal(bookRes.statusCode, 201);
      const bookJson = JSON.parse(bookRes.payload);
      assert.equal(bookJson.success, true);
      assert.ok(bookJson.ticket.ticketNumber.startsWith("#"));
      assert.equal(bookJson.ticket.patientName, "Tariq Mansoor");
      assert.equal(bookJson.ticket.channel, "ONLINE_WEB");

      // 14. GET /api/v1/public/doctors/:slug/queue-status: Returns live status
      const statusRes = await app.inject({
        method: "GET",
        url: "/api/v1/public/doctors/dr-sarah-khan/queue-status",
      });
      assert.equal(statusRes.statusCode, 200);
      const statusJson = JSON.parse(statusRes.payload);
      assert.equal(statusJson.totalWaiting, 1);
      assert.equal(statusJson.tickets.length, 1);
      assert.equal(statusJson.tickets[0].patientName, "Tariq Mansoor");
    } finally {
      mongoAdapter.getQueueTicketCollection = originalGetQueueTicketCol;
      mongoAdapter.getQueueCounterCollection = originalGetQueueCounterCol;
    }

  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});
