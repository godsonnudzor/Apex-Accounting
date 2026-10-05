export default async function handler(_req, res) {
  try {
    await import("./index.js");
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    const missingTarget = String(error?.message || "")
      .match(/Cannot find (?:package|module) ['"]([^'"]+)/i)?.[1]
      ?.split(/[\\/]/)
      .pop();
    return res.status(500).json({
      status: "error",
      reason: missingTarget ? `MISSING_MODULE:${missingTarget}` : error?.code || error?.name || "APP_IMPORT_FAILED",
    });
  }
}