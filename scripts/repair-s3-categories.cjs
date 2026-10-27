// Repairs only missing category/date metadata. Does not move/delete S3 objects.
const { MongoClient } = require('mongoose').mongo;
require('@next/env').loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply');
(async () => {
  const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 7000 });
  try {
    await client.connect(); const collection = client.db('finops').collection('s3assets');
    const rows = await collection.find({ $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] }, { projection: { _id: 1, tenantId: 1, category: 1, contentDate: 1, originalFilename: 1, contentType: 1, key: 1, createdAt: 1 } }).toArray();
    let changed = 0;
    for (const row of rows) {
      const structured = row.key?.match(/\/batches\/[^/]+\/(video|pdf|study-material|assignment)\/(\d{4}-\d{2}-\d{2})\//);
      const category = structured?.[1] || (row.contentType === 'video/mp4' ? 'video' : row.contentType === 'application/pdf' ? 'pdf' : null);
      if (!category || !row.tenantId) { console.log('Skipped ambiguous record: ' + row._id); continue; }
      const values = { category };
      if (!row.contentDate) values.contentDate = structured?.[2] || (row.createdAt instanceof Date ? row.createdAt.toISOString().slice(0, 10) : '');
      console.log(JSON.stringify({ record: String(row._id), filename: row.originalFilename, category, contentDate: values.contentDate || row.contentDate, action: apply ? 'repair' : 'preview' }));
      if (apply) { const result = await collection.updateOne({ _id: row._id, tenantId: row.tenantId, $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] }, { $set: values }); changed += result.modifiedCount; }
    }
    console.log(apply ? `Repaired ${changed} records. No objects moved or deleted.` : 'Preview only. Add --apply to repair the displayed records.');
  } finally { await client.close(); }
})().catch((e) => { console.log('Category repair failed: ' + e.name); process.exitCode = 1; });
