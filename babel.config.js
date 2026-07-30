module.exports = api => {
  const isTest = api.env("test");

  return {
    presets: [
      ["next/babel", isTest ? { "preset-react": { development: false } } : {}]
    ]
  };
};
