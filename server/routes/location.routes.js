import { Router } from 'express';
import * as c from '../controllers/location.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

export const countryRoutes = Router().get('/', c.countries);
export const stateRoutes = Router().get('/', c.states);

const r = Router();
r.get('/', c.listCities);
r.get('/search', c.searchCities);
r.get('/:slug', optionalAuth, c.getCity);
r.post('/:id/join', authenticate, c.joinCity);

export default r;
