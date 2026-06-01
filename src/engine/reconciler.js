export function reconcile(dataset1, dataset2) {
  const countMap1 = new Map();
  const countMap2 = new Map();

  for (const row of dataset1) {
    const key = String(row.__recon_key ?? '');
    countMap1.set(key, (countMap1.get(key) || 0) + 1);
  }

  for (const row of dataset2) {
    const key = String(row.__recon_key ?? '');
    countMap2.set(key, (countMap2.get(key) || 0) + 1);
  }

  const allKeys = new Set([...countMap1.keys(), ...countMap2.keys()]);
  const rows = [];
  let matchCount = 0;
  let onlySheet1Count = 0;
  let onlySheet2Count = 0;
  let duplicatesSheet1 = 0;
  let duplicatesSheet2 = 0;

  for (const uniqueKey of allKeys) {
    const sheet1Count = countMap1.get(uniqueKey) || 0;
    const sheet2Count = countMap2.get(uniqueKey) || 0;
    const inSheet1 = sheet1Count > 0;
    const inSheet2 = sheet2Count > 0;

    let status = 'Unknown';
    if (inSheet1 && inSheet2) {
      status = 'Match between sheets';
      matchCount += 1;
    } else if (inSheet1) {
      status = 'Only Sheet 1';
      onlySheet1Count += 1;
    } else if (inSheet2) {
      status = 'Only Sheet 2';
      onlySheet2Count += 1;
    }

    if (sheet1Count > 1) duplicatesSheet1 += 1;
    if (sheet2Count > 1) duplicatesSheet2 += 1;

    rows.push({
      uniqueKey,
      sheet1Match: inSheet1
        ? sheet1Count > 1
          ? `Duplicate (${sheet1Count} occurrences)`
          : 'Yes'
        : 'No',
      sheet2Match: inSheet2
        ? sheet2Count > 1
          ? `Duplicate (${sheet2Count} occurrences)`
          : 'Yes'
        : 'No',
      status,
      sheet1Count,
      sheet2Count,
    });
  }

  const summary = {
    totalUniqueKeys: allKeys.size,
    matchCount,
    onlySheet1Count,
    onlySheet2Count,
    duplicatesSheet1,
    duplicatesSheet2,
  };

  return { rows, summary };
}
