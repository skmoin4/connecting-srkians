import * as locationService from '../services/location.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';

export const countries = asyncHandler(async (_req, res) => ok(res, { countries: await locationService.listCountries() }));

export const states = asyncHandler(async (req, res) => ok(res, { states: await locationService.listStates(req.query.country) }));

export const listCities = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 100 });
  const { items, total } = await locationService.listCities({ ...req.query, skip, limit });
  paginated(res, { items, total, page, limit });
});

export const searchCities = asyncHandler(async (req, res) => ok(res, { cities: await locationService.searchCities(String(req.query.q || '')) }));

export const getCity = asyncHandler(async (req, res) => ok(res, await locationService.getCityBySlug(req.params.slug, req.user)));

export const joinCity = asyncHandler(async (req, res) => {
  const result = await locationService.joinCity(req.user._id, req.params.id);
  ok(res, result, result.alreadyMember ? 'You are already part of this city community' : `Welcome to ${result.city.name} SRKians!`);
});
