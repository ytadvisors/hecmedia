export const decodeHTML = text => {
  const map = { gt: ">" /* , … */ };
  return text.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gi, ($0, $1) => {
    if ($1[0] === "#") {
      return String.fromCharCode(
        $1[1].toLowerCase() === "x"
          ? parseInt($1.substr(2), 16)
          : parseInt($1.substr(1), 10)
      );
    }
    return map[$1] ? map[$1] : $0;
  });
};

export const cleanUrl = (url, prefix = "") =>
  url && prefix + url.replace(/https?:\/\/[^/]+/, "");
export const cleanText = content => content.replace(/<\/?[^a]?[^>]+(>|$)/g, "");
export const getExcerpt = (excerpt, length = 200) =>
  excerpt.length > length
    ? `${excerpt.replace(/<\/?[^>]+(>|$)/g, "").substring(0, length)}...`
    : excerpt.replace(/<\/?[^>]+(>|$)/g, "");
