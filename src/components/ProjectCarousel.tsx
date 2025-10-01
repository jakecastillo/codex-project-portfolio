import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Fade from '@mui/material/Fade';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import MobileStepper from '@mui/material/MobileStepper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LaunchIcon from '@mui/icons-material/Launch';

import type { Application } from '../types/application';

interface ProjectCarouselProps {
  applications: Application[];
  onSelect: (application: Application) => void;
}

const AUTO_ADVANCE_MS = 8000;

const ProjectCarousel = ({ applications, onSelect }: ProjectCarouselProps) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [activeGroup, setActiveGroup] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const visibleCount = useMemo(() => {
    if (!applications.length) return 0;
    return isMdUp ? Math.min(3, applications.length) : 1;
  }, [applications.length, isMdUp]);

  const totalGroups = useMemo(() => {
    if (!applications.length || visibleCount === 0) return 0;
    return Math.ceil(applications.length / visibleCount);
  }, [applications.length, visibleCount]);

  useEffect(() => {
    setActiveGroup(0);
  }, [applications.length, visibleCount]);

  useEffect(() => {
    if (!applications.length || totalGroups <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveGroup((prev) => (prev + 1) % totalGroups);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [applications.length, totalGroups, isPaused]);

  const groupOffset = activeGroup * (visibleCount || 1);

  const visibleApplications = useMemo(() => {
    if (!applications.length) return [] as Application[];
    if (!visibleCount) return applications;
    return applications.slice(groupOffset, groupOffset + visibleCount);
  }, [applications, groupOffset, visibleCount]);

  const handleNext = useCallback(() => {
    if (totalGroups <= 1) return;
    setActiveGroup((prev) => (prev + 1) % totalGroups);
  }, [totalGroups]);

  const handleBack = useCallback(() => {
    if (totalGroups <= 1) return;
    setActiveGroup((prev) => (prev - 1 + totalGroups) % totalGroups);
  }, [totalGroups]);

  if (!applications.length) {
    return null;
  }

  return (
    <Box
      component="section"
      id="projects"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'relative'
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="overline" sx={{ letterSpacing: '0.3em', color: 'text.secondary' }}>
          Featured applications
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Typography variant={{ xs: 'h4', md: 'h3' }} component="h2" sx={{ maxWidth: 640 }}>
            Immersive consoles, dashboards, and developer tools delivered end-to-end
          </Typography>
          <Button
            variant="text"
            color="inherit"
            endIcon={<LaunchIcon fontSize="small" />}
            href="mailto:jakecast@hawaii.edu?subject=Codex%20application%20brief"
          >
            Request a tailored concept
          </Button>
        </Stack>
      </Stack>

      <Box>
        <Grid
          container
          spacing={{ xs: 3, md: 4 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {visibleApplications.map((app, idx) => {
            const globalRank = groupOffset + idx + 1;
            const isPrimaryCard = idx === 0;

            return (
              <Grid
                xs={12}
                md={4}
                key={app.id}
                sx={{ display: 'flex' }}
              >
                <Fade in timeout={600}>
                  <Card
                    elevation={isPrimaryCard ? 12 : 3}
                    sx={{
                      width: '100%',
                      position: 'relative',
                      background: (themeArg) =>
                        isPrimaryCard
                          ? `linear-gradient(135deg, ${alpha(themeArg.palette.primary.main, 0.25)}, ${alpha(themeArg.palette.primary.dark, 0.08)})`
                          : themeArg.palette.background.paper,
                      transform: isPrimaryCard ? 'translateY(-6px)' : 'translateY(0)',
                      transition: 'transform 220ms ease, box-shadow 220ms ease'
                    }}
                  >
                    <CardActionArea
                      onClick={() => onSelect(app)}
                      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip
                            label={app.tag || 'Case study'}
                            size="small"
                            sx={{
                              backgroundColor: alpha(theme.palette.primary.main, 0.16),
                              color: theme.palette.primary.light
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {String(globalRank).padStart(2, '0')}
                          </Typography>
                        </Stack>
                        <Stack spacing={1.5} flexGrow={1}>
                          <Typography variant="h5" component="h3" sx={{ fontWeight: 600 }}>
                            {app.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            {app.summary}
                          </Typography>
                          <Stack spacing={1} sx={{ mt: 'auto' }}>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
                              Highlights
                            </Typography>
                            <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                              {app.highlights.slice(0, 3).map((highlight) => (
                                <Typography
                                  component="li"
                                  key={highlight}
                                  variant="body2"
                                  sx={{ color: 'text.secondary' }}
                                >
                                  • {highlight}
                                </Typography>
                              ))}
                            </Stack>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              </Grid>
            );
          })}
        </Grid>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 3 }}
        >
          <Stack direction="row" spacing={1}>
            <IconButton
              aria-label="Previous project group"
              color="inherit"
              onClick={handleBack}
              disabled={totalGroups <= 1}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              aria-label="Next project group"
              color="inherit"
              onClick={handleNext}
              disabled={totalGroups <= 1}
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>
          <MobileStepper
            variant="dots"
            steps={Math.max(totalGroups, 1)}
            position="static"
            activeStep={totalGroups ? activeGroup : 0}
            nextButton={<></>}
            backButton={<></>}
            sx={{ backgroundColor: 'transparent', '& .MuiMobileStepper-dotActive': { backgroundColor: 'primary.main' } }}
          />
        </Stack>
      </Box>
    </Box>
  );
};

export default ProjectCarousel;
