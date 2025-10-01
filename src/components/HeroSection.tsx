import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface HeroSectionProps {
  onCtaClick?: () => void;
}

const HeroSection = ({ onCtaClick }: HeroSectionProps) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component="section"
      id="hero"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr auto' },
        gap: { xs: 6, md: 8 },
        py: { xs: 10, md: 14 },
        alignItems: 'center'
      }}
    >
      <Stack spacing={3} maxWidth={620}>
        <Typography variant="overline" sx={{ letterSpacing: '0.3em', color: 'text.secondary' }}>
          Codex-built experiences
        </Typography>
        <Typography variant={isSmall ? 'h3' : 'h2'} component="h1" sx={{ fontWeight: 700 }}>
          Launch-ready product simulations crafted for founders and innovation teams
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          I partner with leaders to prototype ambitious tooling, rich dashboards, and immersive consoles where human
          workflows meet AI orchestration. Each engagement delivers high-fidelity storytelling, scalable architecture, and
          deployment playbooks you can ship.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button
            variant="contained"
            size="large"
            href="#projects"
            onClick={onCtaClick}
            sx={{ px: 4, py: 1.75 }}
          >
            Browse portfolio
          </Button>
          <Button
            variant="outlined"
            size="large"
            href="mailto:jakecast@hawaii.edu"
            sx={{ px: 4, py: 1.75 }}
          >
            Book a discovery call
          </Button>
        </Stack>
      </Stack>

      <Box
        aria-hidden
        sx={{
          position: 'relative',
          width: { xs: '100%', lg: 360 },
          minHeight: 320,
          justifySelf: { xs: 'stretch', lg: 'end' }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(124, 155, 255, 0.35), transparent 55%), radial-gradient(circle at 80% 0%, rgba(244, 143, 177, 0.32), transparent 55%), linear-gradient(160deg, rgba(20, 24, 38, 0.9), rgba(8, 12, 26, 0.9))',
            borderRadius: 6,
            opacity: 0.72,
            filter: 'blur(36px)'
          }}
        />
        <Box
          sx={{
            position: 'relative',
            borderRadius: 5,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background:
              'linear-gradient(135deg, rgba(124, 155, 255, 0.12), rgba(17, 24, 39, 0.72))',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 320,
            p: 3,
            gap: 3
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Delivery playbooks
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Product strategy + technical execution in one partner
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              From ideation and motion prototypes to cloud-ready launch guides, each application ships with operating
              manuals tailored to enterprise teams.
            </Typography>
          </Stack>
          <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0, color: 'text.secondary' }}>
            <li>• Interaction blueprints aligned to vision decks</li>
            <li>• Technical architecture and delivery sequencing</li>
            <li>• Deployment scripts and success metrics</li>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default HeroSection;
