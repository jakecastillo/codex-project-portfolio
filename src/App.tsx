import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';

import ApplicationDialog from './components/ApplicationDialog';
import ContactSection from './components/ContactSection';
import HeroSection from './components/HeroSection';
import NavigationBar from './components/NavigationBar';
import ProjectCarousel from './components/ProjectCarousel';
import SkillsSection from './components/SkillsSection';
import { useApplicationCatalog } from './hooks/useApplicationCatalog';
import theme from './theme';
import type { Application } from './types/application';

const App = () => {
  const { applications, isLoading, error } = useApplicationCatalog();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const heroCtaHandler = () => {
    const anchor = document.getElementById('projects');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const backgroundGradient = useMemo(
    () =>
      'radial-gradient(circle at 0% -20%, rgba(124, 155, 255, 0.12), transparent 55%), radial-gradient(circle at 100% 20%, rgba(244, 143, 177, 0.18), transparent 45%), #05070f',
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: backgroundGradient,
          color: 'text.primary',
          position: 'relative',
          overflowX: 'hidden'
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(124, 155, 255, 0.18), transparent 32%), radial-gradient(circle at 80% 0%, rgba(56, 97, 251, 0.1), transparent 40%)',
            opacity: 0.6,
            filter: 'blur(90px)'
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <NavigationBar />

          <Box component="main" sx={{ flexGrow: 1 }}>
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
              <HeroSection onCtaClick={heroCtaHandler} />

              <Stack spacing={3} sx={{ mt: { xs: 6, md: 8 } }}>
                {isLoading && <LinearProgress color="primary" aria-label="Loading projects" />}
                {error && (
                  <Alert severity="warning" variant="outlined">
                    {error}
                  </Alert>
                )}
              </Stack>

              {!isLoading && !applications.length && !error && (
                <Alert severity="info" variant="outlined" sx={{ mt: 4 }}>
                  New builds are in progress. Check back soon for fresh launches.
                </Alert>
              )}

              {applications.length > 0 && (
                <ProjectCarousel applications={applications} onSelect={setSelectedApplication} />
              )}

              <SkillsSection />
              <ContactSection />
            </Container>
          </Box>

          <Box component="footer" sx={{ py: 4, borderTop: '1px solid rgba(255,255,255,0.04)', mt: 'auto' }}>
            <Container maxWidth="lg">
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  © {new Date().getFullYear()} Codex Collective. Crafted with React, Material UI, and AI-assisted workflows.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Based in Honolulu • Available for remote collaborations
                </Typography>
              </Stack>
            </Container>
          </Box>
        </Box>

        <ApplicationDialog
          application={selectedApplication}
          open={Boolean(selectedApplication)}
          onClose={() => setSelectedApplication(null)}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;
