/**
 * Generates the HTML shell for server-side rendered pages (legacy pages).
 */
const renderAppShell = ({
    title = 'FRP System',
    rootId = 'root',
    css = [],
    scripts = [],
    bodyExtra = ''
}) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  ${css.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n  ')}
  <style>
    html, body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(244, 169, 64, 0.10), transparent 24%),
        radial-gradient(circle at 88% 16%, rgba(47, 111, 178, 0.12), transparent 22%),
        radial-gradient(circle at 50% 100%, rgba(22, 58, 107, 0.06), transparent 26%),
        linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
      color: #1e293b;
      overflow-x: hidden;
    }

    body {
      font-family: 'Inter', sans-serif;
      position: relative;
    }

    #app-shell-bg {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: -1;
      background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,243,249,1) 100%);
    }

    #app-shell-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.55;
      background-image:
        linear-gradient(135deg, rgba(31,78,140,0.08) 0, rgba(31,78,140,0.08) 2px, transparent 2px, transparent 34px),
        radial-gradient(rgba(31,78,140,0.09) 1.2px, transparent 1.2px);
      background-size: 34px 34px, 24px 24px;
      background-position: 0 0, 12px 10px;
    }

    #app-shell-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 18% 8%, rgba(210,218,228,0.94) 0%, rgba(210,218,228,0.94) 10%, rgba(210,218,228,0) 24%),
        radial-gradient(circle at 84% 14%, rgba(47,111,178,0.18) 0%, rgba(47,111,178,0) 18%),
        radial-gradient(circle at 90% 72%, rgba(244,169,64,0.16) 0%, rgba(244,169,64,0) 18%),
        radial-gradient(circle at 76% 100%, rgba(214,224,236,0.88) 0%, rgba(214,224,236,0) 22%);
      filter: blur(2px);
    }

    #${rootId} {
      min-height: 100vh;
      position: relative;
      z-index: 1;
    }
  </style>
</head>
<body>
  <div id="app-shell-bg" aria-hidden="true"></div>
  <div id="${rootId}"></div>
  ${bodyExtra}
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  ${scripts.includes('/js/react-form.jsx') ? `<script crossorigin src="https://unpkg.com/@emotion/react@11.11.1/dist/emotion-react.umd.min.js"></script>
  <script crossorigin src="https://unpkg.com/@emotion/styled@11.11.0/dist/emotion-styled.umd.min.js"></script>
  <script crossorigin src="https://unpkg.com/@mui/material@5.13.7/umd/material-ui.development.js"></script>` : ''}
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${scripts.map((src) => `<script type="text/babel" data-presets="react" src="${src}"></script>`).join('\n  ')}
</body>
</html>`;

module.exports = { renderAppShell };
