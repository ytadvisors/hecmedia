import { resolveHeaderImageSize } from "./index";

describe("resolveHeaderImageSize", () => {
  it.each(["small", "medium", "large", "full"])(
    "preserves the supported %s value",
    value => {
      expect(
        resolveHeaderImageSize({ post: { headerImageSize: value } })
      ).toBe(value);
    }
  );

  it.each([undefined, null, "", "unexpected"])(
    "falls back to full for missing or invalid metadata (%s)",
    value => {
      expect(
        resolveHeaderImageSize(
          value === undefined
            ? undefined
            : { post: { headerImageSize: value } }
        )
      ).toBe("full");
    }
  );
});
