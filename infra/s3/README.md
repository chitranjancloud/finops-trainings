# Private S3 batch content

See [the current batch-content guide](../../S3_BATCH_CONTENT_GUIDE.md) for setup, upload/replace/delete behavior and end-to-end tests.

`storage.yaml` describes a private encrypted/versioned bucket, application CORS and server-only IAM permissions including deletion. It is an infrastructure template; it has not been deployed automatically. `pilot.env.example` lists the existing server environment variables.
