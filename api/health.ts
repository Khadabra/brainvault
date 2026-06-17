export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. This endpoint only supports GET or POST requests." });
  }
  return res.status(200).json({ status: "ok", time: new Date().toISOString() });
}
