import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

const skills = [
  {
    title: 'Product & Delivery',
    items: ['Discovery facilitation', 'Vision storytelling', 'Experiment design', 'Operational playbooks']
  },
  {
    title: 'Frontend Craft',
    items: ['React + TypeScript', 'Material UI / Chakra', 'D3 & data viz', 'Accessible design systems']
  },
  {
    title: 'Platform & AI',
    items: ['Node / Vite toolchains', 'Python orchestration', 'OpenAI / Anthropic LLMs', 'LangChain, Pinecone']
  },
  {
    title: 'Cloud & DevOps',
    items: ['AWS (IaC & CDK)', 'Vercel + Netlify', 'GitHub Actions', 'Observability dashboards']
  }
];

const SkillsSection = () => {
  return (
    <Box component="section" id="skills" sx={{ mt: { xs: 10, md: 12 } }}>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="overline" sx={{ letterSpacing: '0.3em', color: 'text.secondary' }}>
          Capabilities
        </Typography>
        <Typography variant="h4" component="h2" sx={{ maxWidth: 560 }}>
          Pairing interaction design with dependable delivery across the stack
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 640 }}>
          These are the toolkits and rituals that surface in every Codex-led build—shaped for fast prototyping, reliable
          launches, and long-term maintainability.
        </Typography>
      </Stack>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        {skills.map((group) => (
          <Grid key={group.title} xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                p: 4,
                borderRadius: 4,
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                background: (theme) => `linear-gradient(145deg, ${alpha(theme.palette.primary.dark, 0.06)}, rgba(9, 12, 22, 0.92))`
              }}
            >
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {group.title}
                </Typography>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1.25}
                >
                  {group.items.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      variant="outlined"
                      sx={{
                        borderColor: 'rgba(255,255,255,0.24)',
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: 'primary.light',
                          color: 'primary.light'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SkillsSection;
