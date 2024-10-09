async function update(item: SourceString, maxLength: number) {
  const res = await fetch(`https://api.crowdin.com/api/v2/projects/522390/strings/${item.data.id as string}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CROWDIN_API}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      {
        op: 'replace',
        path: '/maxLength',
        value: maxLength
      }
    ]),
    method: 'PATCH'
  });
  const data = await res.json();
  if (!res.ok) console.log(JSON.stringify(data));
  console.log(`${item.data.identifier as string} updated.`);
}

(async () => {
  const limit = 250;
  let [hasMore, offset] = [true, 0];
  const strings: SourceString[] = [];

  while (hasMore) {
    const response = await fetch(`https://api.crowdin.com/api/v2/projects/522390/strings?fileId=18&limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CROWDIN_API}`,
        'Content-Type': 'application/json'
      },
      method: 'GET'
    });

    const result = (await response.json()) as {
      data: SourceString[];
      pagination: { limit: number; offset: number };
    };

    strings.push(...(result.data ?? []));
    hasMore = result.data.length === limit;
    offset = limit + offset;

    console.log(`${strings.length} strings fetched.`);
  }

  for (const item of strings) {
    if (item.data.identifier.endsWith('.description') && item.data.maxLength === 0) {
      if (item.data.text.length > 100) {
        console.log(`${item.data.identifier as string} is too long.`);
      }
      await update(item, 100);
    }

    if (item.data.identifier.includes('.choices.') && item.data.maxLength === 0) {
      if (item.data.text.length > 32) {
        console.log(`${item.data.identifier as string} is too long.`);
      }
      await update(item, 32);
    }
  }
})();

interface SourceString {
  data: {
    id: string;
    identifier: string;
    maxLength: number;
    text: string;
  };
}
