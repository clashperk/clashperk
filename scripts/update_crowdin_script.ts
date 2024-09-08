import 'reflect-metadata';

(async () => {
  const response = await fetch('https://api.crowdin.com/api/v2/projects/522390/strings?fileId=18&limit=500', {
    headers: {
      'Authorization': `Bearer ${process.env.CROWDIN_API}`,
      'Content-Type': 'application/json'
    },
    method: 'GET'
  });
  const result = await response.json();
  if (!response.ok) console.log(JSON.stringify(result));

  for (const item of (result as any).data ?? []) {
    if (item.data.identifier.endsWith('.description') && item.data.maxLength === 0) {
      if (item.data.text.length > 100) {
        console.log(`${item.data.identifier as string} is too long.`);
      }

      const res = await fetch(`https://api.crowdin.com/api/v2/projects/522390/strings/${item.data.id as string}`, {
        headers: {
          'Authorization': `Bearer ${process.env.CROWDIN_API}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {
            op: 'replace',
            path: '/maxLength',
            value: 100
          }
        ]),
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) console.log(JSON.stringify(data));
      console.log(`${item.data.identifier as string} updated.`);
    }
  }
})();
