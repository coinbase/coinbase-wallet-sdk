/**
 * @type {import('next').NextConfig}
 */
module.exports = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none", // Or 'unsafe-none' if you want to disable COOP
          },
        ],
      },
    ];
  },
};
