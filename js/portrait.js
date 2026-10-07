/* Flat, clearly-illustrative member "photos" (no real people). portrait(i) -> SVG string */
window.portrait = function (i, size) {
  var P = [
    { bg: "#DCE6FF", skin: "#C68B59", hair: "#2B1D14", shirt: "#2A55D4", style: "short" },
    { bg: "#FCE7D6", skin: "#E0AC7E", hair: "#4A2E1C", shirt: "#0B6B73", style: "long" },
    { bg: "#DDF2E2", skin: "#8D5A3B", hair: "#1B1210", shirt: "#344054", style: "short" },
    { bg: "#EADCFB", skin: "#F1C7A0", hair: "#6B4226", shirt: "#B54A1F", style: "long" },
    { bg: "#FCF1D2", skin: "#B57A4E", hair: "#2B1D14", shirt: "#1F2735", style: "bald" },
    { bg: "#CDEBE8", skin: "#D9A273", hair: "#3B2618", shirt: "#6440D6", style: "short" },
    { bg: "#FBDDE5", skin: "#A86F47", hair: "#121826", shirt: "#15803D", style: "long" },
    { bg: "#E6EEF9", skin: "#E7B48A", hair: "#5A3A22", shirt: "#4A5568", style: "kid" }
  ];
  var p = P[i % P.length], s = size || 80;
  var hair = {
    short: '<path d="M26.5 33c0-11 6.5-17.5 13.5-17.5S53.5 22 53.5 33c-2.5-6-7-8.5-13.5-8.5S29 27 26.5 33z" fill="' + p.hair + '"/>',
    long: '<path d="M24.5 50V35c0-12.5 7-19.5 15.5-19.5S55.5 22.5 55.5 35v15c-3-2.5-3.5-7-3.5-13-2.5-6-6.5-8.5-12-8.5s-9.5 2.5-12 8.5c0 6-.5 10.5-3.5 13z" fill="' + p.hair + '"/>',
    bald: '<path d="M27 30c1-8 6-13 13-13s12 5 13 13c-3-3-7-4-13-4s-10 1-13 4z" fill="' + p.hair + '" opacity=".55"/>',
    kid: '<path d="M27.5 33c0-10 5.5-15.5 12.5-15.5S52.5 23 52.5 33c-1.5-3-3.5-5-6.5-6-2 2-6 3-11 3-3 0-6 1-7.5 3z" fill="' + p.hair + '"/>'
  }[p.style];
  return '<svg viewBox="0 0 80 80" width="' + s + '" height="' + s + '" role="img" aria-label="Foto del miembro">' +
    '<rect width="80" height="80" fill="' + p.bg + '"/>' +
    '<path d="M12 80c2-15 13-23 28-23s26 8 28 23z" fill="' + p.shirt + '"/>' +
    '<rect x="35" y="45" width="10" height="13" rx="4" fill="' + p.skin + '"/>' +
    '<ellipse cx="40" cy="35" rx="13" ry="15" fill="' + p.skin + '"/>' + hair + '</svg>';
};
