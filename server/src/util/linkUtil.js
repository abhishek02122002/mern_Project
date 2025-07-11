//

const getDeviceInfo = (userAgent) => {
  const isMobile = /mobile/i.test(userAgent);
  const browser =userAgent.match(/(chrome|Firefox|Safari|Edge|Opera)/i)?.[0] || "unknown";
  return {
    isMobile,
    browser,
  };
};

module.exports = { getDeviceInfo };
