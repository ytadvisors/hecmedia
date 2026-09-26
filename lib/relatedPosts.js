const nodeForEntry = entry =>
  entry && (entry.relatedPost || entry.node || entry);

const identitiesForPost = post => {
  if (!post) return [];
  const identities = [];
  if (post.postId !== undefined && post.postId !== null) {
    identities.push(`id:${post.postId}`);
  }
  if (post.slug) identities.push(`slug:${post.slug}`);
  return identities;
};

const categoryIdsForPost = post =>
  (((post || {}).categories || {}).edges || [])
    .map(edge => edge && edge.node && edge.node.categoryId)
    .filter(value => value !== undefined && value !== null)
    .map(String);

const selectRelatedPosts = ({
  currentPost,
  categoryIds = [],
  editorial = [],
  fallback = [],
  limit = 3
}) => {
  const requiredCategories = new Set(categoryIds.map(String));
  const seen = new Set();
  identitiesForPost(currentPost).forEach(identity => seen.add(identity));

  return [...editorial, ...fallback].reduce((selected, entry) => {
    if (selected.length >= limit) return selected;

    const post = nodeForEntry(entry);
    const identities = identitiesForPost(post);
    if (!post || identities.length === 0) return selected;
    if (identities.some(identity => seen.has(identity))) return selected;

    const candidateCategories = categoryIdsForPost(post);
    if (
      requiredCategories.size > 0 &&
      !candidateCategories.some(categoryId =>
        requiredCategories.has(categoryId)
      )
    ) {
      return selected;
    }

    identities.forEach(identity => seen.add(identity));
    return [...selected, post];
  }, []);
};

export default selectRelatedPosts;
