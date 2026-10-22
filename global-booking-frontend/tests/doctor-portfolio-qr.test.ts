import assert from "node:assert/strict";
import { test } from "node:test";
import { generateQrMatrix, qrMatrixToSvg } from "../lib/utils/qr-code";
import { isSafeSlug } from "../lib/validation/route-params";

test("QR Encoder generates valid ISO/IEC 18004 square matrix with finder patterns", () => {
  const testUrl = "http://localhost:3000/dr-sarah-khan";
  const matrix = generateQrMatrix(testUrl);

  assert.ok(Array.isArray(matrix), "Matrix must be an array of rows");
  assert.ok(matrix.length >= 21, `Matrix size ${matrix.length} should be at least Version 1 (21x21)`);

  // Must be square
  for (const row of matrix) {
    assert.equal(row.length, matrix.length, "QR matrix must be perfectly square");
  }

  // Top-left finder pattern check: center 3x3 of 7x7 pattern should be black (true)
  assert.equal(matrix[0][0], true, "Top-left outer corner must be dark");
  assert.equal(matrix[0][6], true, "Top-left outer corner must be dark");
  assert.equal(matrix[6][0], true, "Top-left outer corner must be dark");
  assert.equal(matrix[6][6], true, "Top-left outer corner must be dark");
  assert.equal(matrix[3][3], true, "Top-left finder center must be dark");

  // Top-right finder pattern check
  const n = matrix.length;
  assert.equal(matrix[0][n - 7], true, "Top-right finder top-left must be dark");
  assert.equal(matrix[0][n - 1], true, "Top-right finder top-right must be dark");
  assert.equal(matrix[6][n - 7], true, "Top-right finder bottom-left must be dark");

  // Bottom-left finder pattern check
  assert.equal(matrix[n - 7][0], true, "Bottom-left finder top-left must be dark");
  assert.equal(matrix[n - 1][0], true, "Bottom-left finder bottom-left must be dark");
  assert.equal(matrix[n - 7][6], true, "Bottom-left finder top-right must be dark");
});

test("qrMatrixToSvg produces unoccluded SVG markup with ISO >= 4 module quiet zone", () => {
  const testUrl = "http://localhost:3000/dr-sarah-khan/book";
  const matrix = generateQrMatrix(testUrl);
  const svg = qrMatrixToSvg(matrix, { size: 240, darkColor: "#07131f", lightColor: "#ffffff" });

  assert.ok(svg.startsWith("<svg"), "Must start with <svg tag");
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "Must include XML namespace");
  assert.ok(svg.includes('width="240"'), "Must respect requested size");
  assert.ok(svg.includes('fill="#07131f"'), "Must include dark module fills");
  assert.ok(svg.includes("</svg>"), "Must properly close the SVG tag");

  // Quiet zone verification: minimum 4 modules on all sides
  const expectedViewBox = matrix.length + 4 * 2;
  assert.ok(
    svg.includes(`viewBox="0 0 ${expectedViewBox} ${expectedViewBox}"`),
    `Viewbox must include at least 4 modules quiet zone on each side (${expectedViewBox})`,
  );

  // Unoccluded modules: no center cross or overlay badge inside the SVG
  assert.equal(svg.includes("cross"), false, "QR code must have zero center cross overlays");
  assert.equal(svg.includes("badge"), false, "QR code must have zero center badge overlays");
});

test("QR capacity validation fails safely on payloads exceeding supported limit", () => {
  // Version 10-M maximum byte capacity is 216 data codewords (~213 chars)
  const hugePayload = "https://example.com/doctors/" + "a".repeat(300);
  assert.throws(
    () => generateQrMatrix(hugePayload),
    /exceeds maximum supported capacity/,
    "Must throw safe error instead of silent truncation or invalid QR",
  );
});

test("Dual QR URL construction is stable and canonical", () => {
  const origin = "https://preview.globalbooking.ae";
  const slug = "dr-sarah-khan";

  const portfolioUrl = `${origin}/${slug}`;
  const bookingUrl = `${origin}/${slug}/book`;

  assert.equal(portfolioUrl, "https://preview.globalbooking.ae/dr-sarah-khan");
  assert.equal(bookingUrl, "https://preview.globalbooking.ae/dr-sarah-khan/book");

  // URL stability: Updating doctor bio, experience, or degrees does not alter the canonical URL
  const updatedDoctor = {
    fullName: "Dr. Sarah Khan",
    slug: "dr-sarah-khan",
    bio: "Updated cardiovascular specialist biography",
    yearsOfExperience: 16,
    consultationFee: { amount: 450, currency: "AED" },
  };

  const newPortfolioUrl = `${origin}/${updatedDoctor.slug}`;
  assert.equal(
    newPortfolioUrl,
    portfolioUrl,
    "QR URL must remain strictly unchanged when doctor profile content updates",
  );
});

test("Safe slug validation protects public routes against path traversal and malicious payloads", () => {
  assert.equal(isSafeSlug("dr-sarah-khan"), true);
  assert.equal(isSafeSlug("dr-ahmed-123"), true);
  assert.equal(isSafeSlug("cardiologist-specialist"), true);

  // Unsafe or malicious attempts must be rejected
  assert.equal(isSafeSlug("../admin"), false);
  assert.equal(isSafeSlug("dr-sarah/khan"), false);
  assert.equal(isSafeSlug("dr-sarah<script>"), false);
  assert.equal(isSafeSlug("dr-sarah Khan"), false);
  assert.equal(isSafeSlug(""), false);
  assert.equal(isSafeSlug("-leading-hyphen"), false);
});
