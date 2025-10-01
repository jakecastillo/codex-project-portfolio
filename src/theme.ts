import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c9bff'
    },
    secondary: {
      main: '#f48fb1'
    },
    background: {
      default: '#05070f',
      paper: 'rgba(15, 19, 31, 0.92)'
    },
    text: {
      primary: '#f8fbff',
      secondary: 'rgba(248, 251, 255, 0.72)'
    }
  },
  typography: {
    fontFamily: [
      '"Plus Jakarta Sans"',
      'Inter',
      'system-ui',
      'sans-serif'
    ].join(','),
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontWeight: 600
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 16
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          backgroundImage: 'linear-gradient(135deg, rgba(124, 155, 255, 0.06), rgba(56, 97, 251, 0.02))'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      }
    }
  }
});

export default theme;
