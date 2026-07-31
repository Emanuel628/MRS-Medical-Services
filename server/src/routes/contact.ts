import { Router } from 'express';

const router = Router();

router.post('/', (_request, response) => {
  response.status(501).json({ message: 'Contact submissions are not enabled yet.' });
});

export default router;
