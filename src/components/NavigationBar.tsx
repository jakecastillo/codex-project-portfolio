import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

const links = [
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' }
];

const NavigationBar = () => {
  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        top: 0,
        backdropFilter: 'blur(18px)',
        backgroundColor: (theme) => alpha(theme.palette.background.default, 0.72),
        borderBottom: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', gap: 3, py: { xs: 1, md: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}
          >
            ◎
          </Box>
          <Box>
            <Typography component="span" variant="caption" sx={{ display: 'block', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Codex Collective
            </Typography>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              Application Portfolio
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
          {links.map((link) => (
            <Button
              key={link.label}
              href={link.href}
              color="inherit"
              variant="text"
              size="small"
              sx={{ fontWeight: 500, letterSpacing: '0.04em' }}
            >
              {link.label}
            </Button>
          ))}
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          <Button
            href="mailto:jakecast@hawaii.edu"
            variant="contained"
            color="primary"
            size="medium"
          >
            Request Brief
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;
