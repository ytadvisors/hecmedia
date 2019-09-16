import _ from "lodash";

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

export const removeDuplicates = (myArr, prop) =>
  myArr.filter(
    (obj, pos, arr) =>
      arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos
  );

export const getArrayUnion = (array1, array2, prop, uniqueId) => {
  const updateArray = { ...array2 };
  if (array2 && array2[prop] && array1) {
    updateArray[prop].edges = _.unionBy(
      array1[prop].edges,
      array2[prop].edges,
      uniqueId
    );
    updateArray.__typename = array1[prop].__typename;
  }
  return updateArray;
};
