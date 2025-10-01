import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const ContactSection = () => {
  return (
    <Box component="section" id="contact" sx={{ mt: { xs: 10, md: 14 }, mb: { xs: 10, md: 12 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          alignItems: { xs: 'flex-start', md: 'center' },
          textAlign: { xs: 'left', md: 'center' }
        }}
      >
        <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
          <Typography variant="overline" sx={{ letterSpacing: '0.3em', color: 'text.secondary', textAlign: 'center', width: '100%' }}>
            Let’s build
          </Typography>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
            Ready for a discovery sprint, investor deck, or immersive console?
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Share the problem space, how you measure success, and any constraints. I’ll return with a tailored playbook,
            timeline, and integration plan you can socialise with stakeholders.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button
            variant="contained"
            size="large"
            href="mailto:jakecast@hawaii.edu?subject=Portfolio%20inquiry"
            sx={{ px: 4 }}
          >
            Email Jake
          </Button>
          <Button
            variant="outlined"
            size="large"
            href="https://www.linkedin.com/in/jakecastillo"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
            sx={{ px: 4 }}
          >
            Connect on LinkedIn
          </Button>
          <Button
            variant="text"
            size="large"
            href="https://github.com/jakecastillo"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
            sx={{ px: 4 }}
          >
            GitHub
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ContactSection;
