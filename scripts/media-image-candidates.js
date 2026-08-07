function extractRemoteImageCandidates(html) {
  const candidates = [];
  const content = String(html || "");
  const imagePattern = /<img\b[^>]*>/gi;
  let image = imagePattern.exec(content);

  while (image) {
    const attributePattern = /\b(src|srcset)=["']([^"']+)["']/gi;
    let attribute = attributePattern.exec(image[0]);
    while (attribute) {
      const rawValue = attribute[2].replace(/&amp;/g, "&");
      const values =
        attribute[1].toLowerCase() === "srcset"
          ? rawValue.split(",").map(value => value.trim().split(/\s+/)[0])
          : [rawValue.trim()];

      values.forEach(url => {
        if (/^https?:\/\//i.test(url) && !candidates.includes(url)) {
          candidates.push(url);
        }
      });
      attribute = attributePattern.exec(image[0]);
    }
    image = imagePattern.exec(content);
  }

  return candidates;
}

module.exports = { extractRemoteImageCandidates };
