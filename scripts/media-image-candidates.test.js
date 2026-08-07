const { extractRemoteImageCandidates } = require("./media-image-candidates");

test("extracts and deduplicates remote img src and srcset candidates", () => {
  const html = [
    '<img src="/static/logo.png">',
    '<iframe src="https://media.example.com/embed"></iframe>',
    '<img src="https://media.example.com/story.jpg?x=1&amp;y=2" srcset="https://media.example.com/story-small.jpg 320w, https://media.example.com/story.jpg?x=1&amp;y=2 1280w">',
    '<img srcset="https://media.example.com/banner-small.jpg 1x, https://media.example.com/banner-large.jpg 2x">'
  ].join("");

  expect(extractRemoteImageCandidates(html)).toEqual([
    "https://media.example.com/story.jpg?x=1&y=2",
    "https://media.example.com/story-small.jpg",
    "https://media.example.com/banner-small.jpg",
    "https://media.example.com/banner-large.jpg"
  ]);
});

test("does not split commas in a src URL", () => {
  expect(
    extractRemoteImageCandidates(
      '<img src="https://media.example.com/image.jpg?crop=10,20,30,40">'
    )
  ).toEqual(["https://media.example.com/image.jpg?crop=10,20,30,40"]);
});
