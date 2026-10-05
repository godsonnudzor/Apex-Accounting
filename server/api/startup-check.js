export default async function handler(_req, res) {
  try {
    await import("./index.js");
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    const missingPackage = String(error?.message || "").match(/Cannot find package ['"]([^'"]+)/)?.[1];
    return res.status(500).json({
      status: "error",
      reason: missingPackage ? `MISSING_PACKAGE:${missingPackage}` : error?.code || error?.name || "APP_IMPORT_FAILED",
    });
  }
}