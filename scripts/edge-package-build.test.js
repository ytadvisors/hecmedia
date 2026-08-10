jest.mock("fs", () => ({
  copyFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  renameSync: jest.fn(),
  rmSync: jest.fn()
}));
jest.mock("@sls-next/lambda-at-edge", () => ({
  Builder: jest.fn().mockImplementation(() => ({ build: jest.fn() }))
}));

const fs = require("fs");
const {
  assertNewsletterOnlyApiSource,
  build,
  discardEmptyApiLambdaBundle,
  discardUnusedImageLambdaBundle,
  stageNextServerRuntime,
  sourceUsesNextImage
} = require("./edge-package-build");

beforeEach(() => {
  fs.existsSync.mockReset();
  fs.readFileSync.mockReset();
  fs.readdirSync.mockReset();
  fs.readdirSync.mockReturnValue([]);
  fs.renameSync.mockReset();
  fs.rmSync.mockReset();
  fs.copyFileSync.mockReset();
  fs.mkdirSync.mockReset();
});

function mockApiBundle(manifest, compiledEntries = []) {
  fs.existsSync.mockImplementation(
    file =>
      file.endsWith("api-lambda") ||
      file.endsWith("api-lambda/manifest.json") ||
      file.endsWith("api-lambda/pages/api")
  );
  fs.readFileSync.mockReturnValue(JSON.stringify(manifest));
  fs.readdirSync.mockReturnValue(compiledEntries);
}

test("discards a generated API bundle only when its manifest and pages are empty", () => {
  mockApiBundle({ apis: { dynamic: {}, nonDynamic: {} } });

  discardEmptyApiLambdaBundle();

  expect(fs.rmSync).toHaveBeenCalledWith(expect.stringMatching(/api-lambda$/), {
    recursive: true,
    force: false
  });
});

test("discards a manifest-less API bundle only when the directory is file-empty", () => {
  fs.existsSync.mockImplementation(file => file.endsWith("api-lambda"));
  fs.readdirSync.mockReturnValue([]);

  discardEmptyApiLambdaBundle();

  expect(fs.readFileSync).not.toHaveBeenCalled();
  expect(fs.rmSync).toHaveBeenCalledWith(expect.stringMatching(/api-lambda$/), {
    recursive: true,
    force: false
  });
});

test("rejects files in a manifest-less API bundle", () => {
  fs.existsSync.mockImplementation(file => file.endsWith("api-lambda"));
  fs.readdirSync.mockReturnValue([
    { name: "unexpected.js", isFile: () => true, isDirectory: () => false }
  ]);

  expect(() => discardEmptyApiLambdaBundle()).toThrow(
    "no manifest but contains files"
  );
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test.each([
  [{ apis: { dynamic: { "/api/[id]": {} }, nonDynamic: {} } }, "/api/[id]"],
  [
    { apis: { dynamic: {}, nonDynamic: { "/api/newsletter": {} } } },
    "/api/newsletter"
  ]
])("rejects a generated API bundle containing routes", (manifest, route) => {
  mockApiBundle(manifest);

  expect(() => discardEmptyApiLambdaBundle()).toThrow(route);
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("rejects a malformed API manifest", () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue("not-json");

  expect(() => discardEmptyApiLambdaBundle()).toThrow("manifest is invalid");
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("rejects compiled API files even when the manifest claims no routes", () => {
  mockApiBundle({ apis: { dynamic: {}, nonDynamic: {} } }, [
    { name: "newsletter.js", isFile: () => true, isDirectory: () => false }
  ]);

  expect(() => discardEmptyApiLambdaBundle()).toThrow("compiled API files");
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("discards the image bundle only for an explicitly disabled, unused optimizer", () => {
  const original = process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = "true";
  fs.existsSync.mockImplementation(file => file.endsWith("image-lambda"));
  fs.readdirSync.mockReturnValue([]);

  try {
    discardUnusedImageLambdaBundle();
  } finally {
    if (original === undefined)
      delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
    else process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = original;
  }

  expect(fs.rmSync).toHaveBeenCalledWith(
    expect.stringMatching(/image-lambda$/),
    { recursive: true, force: false }
  );
});

test("rejects an image bundle unless the optimizer flag is set", () => {
  const original = process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
  delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
  fs.existsSync.mockImplementation(file => file.endsWith("image-lambda"));

  try {
    expect(() => discardUnusedImageLambdaBundle()).toThrow(
      "HECMEDIA_DISABLE_IMAGE_OPTIMIZER is not true"
    );
  } finally {
    if (original === undefined)
      delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
    else process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = original;
  }
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("detects next/image imports before discarding an image bundle", () => {
  fs.readdirSync.mockReturnValueOnce([
    { name: "page.js", isFile: () => true, isDirectory: () => false }
  ]);
  fs.readFileSync.mockReturnValue('import Image from "next/image";');

  expect(sourceUsesNextImage("/repo")).toBe(true);
});

test("stages the Next 12 webpack runtime omitted by the legacy edge packager", () => {
  fs.existsSync.mockImplementation(
    file =>
      file.endsWith(".next/serverless/webpack-runtime.js") ||
      file.endsWith(".next/serverless/chunks")
  );
  fs.readdirSync.mockImplementation(file => {
    if (file.endsWith(".next/serverless/chunks")) {
      return [
        {
          name: "runtime-chunk.js",
          isDirectory: () => false,
          isFile: () => true
        }
      ];
    }
    return [];
  });

  stageNextServerRuntime();

  expect(fs.copyFileSync).toHaveBeenCalledWith(
    expect.stringMatching(/\.next\/serverless\/webpack-runtime\.js$/),
    expect.stringMatching(
      /\.serverless_nextjs\/default-lambda\/webpack-runtime\.js$/
    )
  );
  expect(fs.mkdirSync).toHaveBeenCalledWith(
    expect.stringMatching(/\.serverless_nextjs\/default-lambda\/chunks$/),
    { recursive: true }
  );
  expect(fs.copyFileSync).toHaveBeenCalledWith(
    expect.stringMatching(/\.next\/serverless\/chunks\/runtime-chunk\.js$/),
    expect.stringMatching(
      /\.serverless_nextjs\/default-lambda\/chunks\/runtime-chunk\.js$/
    )
  );
});

test("omits API routes only for a no-send diagnostic build and restores them", async () => {
  const originalNoSend = process.env.HECMEDIA_NO_SEND_FORMS;
  process.env.HECMEDIA_NO_SEND_FORMS = "true";
  fs.existsSync.mockImplementation(file => {
    if (file.endsWith("pages/api")) return true;
    if (file.endsWith(".edge-build-omitted-pages-api")) return false;
    if (file.endsWith("default-lambda") || file.endsWith("assets")) return true;
    if (file.endsWith(".next/serverless/webpack-runtime.js")) return true;
    if (file.endsWith(".next/serverless/chunks")) return true;
    return false;
  });

  try {
    await build();
  } finally {
    if (originalNoSend === undefined) delete process.env.HECMEDIA_NO_SEND_FORMS;
    else process.env.HECMEDIA_NO_SEND_FORMS = originalNoSend;
  }

  expect(fs.renameSync.mock.calls).toEqual([
    [
      expect.stringMatching(/pages\/api$/),
      expect.stringMatching(/\.edge-build-omitted-pages-api$/)
    ],
    [
      expect.stringMatching(/\.edge-build-omitted-pages-api$/),
      expect.stringMatching(/pages\/api$/)
    ]
  ]);
  expect(fs.copyFileSync).toHaveBeenCalled();
  expect(fs.mkdirSync).toHaveBeenCalled();
});

test("omits only the reviewed newsletter API in targeted production mode", async () => {
  const originalNoSend = process.env.HECMEDIA_NO_SEND_FORMS;
  const originalEdgeApi = process.env.HECMEDIA_EDGE_API;
  const originalNewsletterMode = process.env.HECMEDIA_NEWSLETTER_MODE;
  process.env.HECMEDIA_NO_SEND_FORMS = "false";
  process.env.HECMEDIA_EDGE_API = "false";
  process.env.HECMEDIA_NEWSLETTER_MODE = "omit";
  fs.existsSync.mockImplementation(file => {
    if (file.endsWith("pages/api") || file.endsWith("pages/api/newsletter"))
      return true;
    if (file.endsWith(".edge-build-omitted-pages-api")) return false;
    if (file.endsWith("default-lambda") || file.endsWith("assets")) return true;
    if (file.endsWith(".next/serverless/webpack-runtime.js")) return true;
    if (file.endsWith(".next/serverless/chunks")) return true;
    return false;
  });
  fs.readdirSync.mockImplementation(file => {
    if (file.endsWith("pages/api")) {
      return [
        {
          name: "newsletter",
          isDirectory: () => true,
          isFile: () => false
        }
      ];
    }
    if (file.endsWith("pages/api/newsletter")) {
      return [
        {
          name: "subscribe.js",
          isDirectory: () => false,
          isFile: () => true
        }
      ];
    }
    return [];
  });

  try {
    await build();
  } finally {
    if (originalNoSend === undefined) delete process.env.HECMEDIA_NO_SEND_FORMS;
    else process.env.HECMEDIA_NO_SEND_FORMS = originalNoSend;
    if (originalEdgeApi === undefined) delete process.env.HECMEDIA_EDGE_API;
    else process.env.HECMEDIA_EDGE_API = originalEdgeApi;
    if (originalNewsletterMode === undefined)
      delete process.env.HECMEDIA_NEWSLETTER_MODE;
    else process.env.HECMEDIA_NEWSLETTER_MODE = originalNewsletterMode;
  }

  expect(fs.renameSync.mock.calls).toEqual([
    [
      expect.stringMatching(/pages\/api$/),
      expect.stringMatching(/\.edge-build-omitted-pages-api$/)
    ],
    [
      expect.stringMatching(/\.edge-build-omitted-pages-api$/),
      expect.stringMatching(/pages\/api$/)
    ]
  ]);
});

test("targeted newsletter omission rejects any unexpected API source", () => {
  fs.existsSync.mockReturnValue(true);
  fs.readdirSync.mockReturnValue([
    { name: "unexpected.js", isDirectory: () => false, isFile: () => true }
  ]);

  expect(() => assertNewsletterOnlyApiSource("/repo/pages/api")).toThrow(
    "found unexpected.js"
  );
});
