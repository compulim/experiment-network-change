import { createHmac } from 'crypto';

// Adopted from https://learn.microsoft.com/en-us/rest/api/eventhub/generate-sas-token#nodejs.
export default function generateServiceBusSharedAccessSignatureToken(uri, sharedAccessKeyName, sharedAccessKey) {
  console.log(uri, sharedAccessKeyName, sharedAccessKey);

  const encoded = encodeURIComponent(uri);
  const fifteenMinutesInSeconds = 15 * 60;
  const ttl = Math.round(Date.now() / 1000) + fifteenMinutesInSeconds;
  const signature = encoded + '\n' + ttl;
  const hash = createHmac('sha256', sharedAccessKey).update(signature, 'utf8').digest('base64');

  const searchParams = new URLSearchParams([
    ['sr', uri],
    ['sig', hash],
    ['se', ttl],
    ['skn', sharedAccessKeyName]

    // ['sr', encoded],
    // ['sig', encodeURIComponent(hash)],
    // ['se', ttl],
    // ['skn', sharedAccessKeyName]
  ]);

  return `SharedAccessSignature ${searchParams}`;
}
