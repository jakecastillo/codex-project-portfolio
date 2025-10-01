import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import type { Application } from '../types/application';

interface ApplicationDialogProps {
  application: Application | null;
  open: boolean;
  onClose: () => void;
}

const BASE_DESKTOP_DIMENSIONS = { width: 1280, height: 800 } as const;
const BASE_MOBILE_DIMENSIONS = { width: 414, height: 896 } as const;

const ApplicationDialog = ({ application, open, onClose }: ApplicationDialogProps) => {
  const previewHref = useMemo(() => application?.links?.[0]?.href ?? '', [application]);
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);

  const baseDimensions = useMemo(() => (isMdDown ? BASE_MOBILE_DIMENSIONS : BASE_DESKTOP_DIMENSIONS), [isMdDown]);

  useEffect(() => {
    setIsPreviewLoaded(false);
  }, [previewHref, open]);

  useEffect(() => {
    if (!open) return;
    const node = previewWrapperRef.current;
    if (!node) return;

    const computeScale = (width: number, height: number) => {
      const scaleX = width / baseDimensions.width;
      const scaleY = height / baseDimensions.height;
      const nextScale = Math.min(scaleX, scaleY, 1);
      setPreviewScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    if (typeof ResizeObserver === 'undefined') {
      const rect = node.getBoundingClientRect();
      computeScale(rect.width, rect.height);
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      computeScale(width, height);
    });

    resizeObserver.observe(node);
    const rect = node.getBoundingClientRect();
    computeScale(rect.width, rect.height);

    return () => resizeObserver.disconnect();
  }, [open, baseDimensions.width, baseDimensions.height]);

  const previewInnerStyles = useMemo(() => ({
    width: baseDimensions.width,
    height: baseDimensions.height,
    display: 'block',
    transform: `scale(${previewScale})`,
    transformOrigin: '0 0',
    pointerEvents: 'auto'
  }), [baseDimensions.height, baseDimensions.width, previewScale]);

  const iframeStyles = useMemo(() => ({
    width: '100%',
    height: '100%',
    border: 0,
    display: 'block',
    backgroundColor: '#05070f'
  }), []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="application-dialog-title"
    >
      {application ? (
        <>
          <DialogTitle id="application-dialog-title">
            <Stack spacing={1}>
              <Typography variant="overline" sx={{ letterSpacing: '0.3em', color: 'text.secondary' }}>
                {application.tag || 'Case study'}
              </Typography>
              <Typography variant="h4" component="h3">
                {application.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {application.summary}
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
            <Grid container spacing={4}>
              <Grid xs={12} md={7}>
                <Box
                  ref={previewWrapperRef}
                  sx={{
                    position: 'relative',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(7, 11, 19, 0.9)',
                    aspectRatio: `${baseDimensions.width} / ${baseDimensions.height}`,
                    width: '100%',
                    minHeight: isMdDown ? 420 : 560,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start'
                  }}
                >
                  {previewHref ? (
                    <>
                      <Box sx={previewInnerStyles}>
                        <Box
                          component="iframe"
                          title={`${application.title} preview`}
                          src={previewHref}
                          loading="lazy"
                          onLoad={() => setIsPreviewLoaded(true)}
                          onError={() => setIsPreviewLoaded(true)}
                          sx={iframeStyles}
                          allowFullScreen
                        />
                      </Box>
                      {!isPreviewLoaded && (
                        <Stack
                          alignItems="center"
                          justifyContent="center"
                          spacing={1}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(5, 7, 15, 0.55)',
                            backdropFilter: 'blur(4px)',
                            pointerEvents: 'none'
                          }}
                        >
                          <CircularProgress size={32} />
                          <Typography variant="caption" color="text.secondary">Loading preview…</Typography>
                        </Stack>
                      )}
                    </>
                  ) : (
                    <Stack spacing={1.5} alignItems="center" justifyContent="center" sx={{ p: 6 }}>
                      <Typography variant="body1">Preview coming soon.</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Reach out for a guided walkthrough and interactive demo.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Grid>

              <Grid xs={12} md={5}>
                <Stack spacing={3}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Project overview
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                      {application.description}
                    </Typography>
                  </Stack>

                  <Divider flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                  {!!application.tech.length && (
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Tech stack
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {application.tech.map((item) => (
                          <Button key={item} size="small" variant="outlined" sx={{ pointerEvents: 'none' }}>
                            {item}
                          </Button>
                        ))}
                      </Stack>
                    </Stack>
                  )}

                  {!!application.highlights.length && (
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Engagement highlights
                      </Typography>
                      <Stack component="ul" spacing={1.25} sx={{ listStyle: 'disc', pl: 3, m: 0 }}>
                        {application.highlights.map((highlight) => (
                          <Typography key={highlight} component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                            {highlight}
                          </Typography>
                        ))}
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: { xs: 3, md: 4 }, py: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Interact with the embedded preview or open the full application in a new tab.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {application.links.map((link, index) => (
                <Button
                  key={`${link.href}-${index}`}
                  variant={index === 0 ? 'contained' : 'outlined'}
                  color={index === 0 ? 'primary' : 'inherit'}
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  href={link.href}
                  target={link.target ?? '_blank'}
                  rel={link.rel ?? (link.target === '_blank' ? 'noopener noreferrer' : undefined)}
                >
                  {index === 0 ? 'Open full application' : link.label}
                </Button>
              ))}
              <Button onClick={onClose} color="inherit">
                Close
              </Button>
            </Stack>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  );
};

export default ApplicationDialog;
