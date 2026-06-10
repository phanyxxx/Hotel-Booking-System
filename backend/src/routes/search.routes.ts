import { Router } from 'express';
import { searchController } from '../controllers/search.controller';

const router = Router();

router.get('/hotels', searchController.searchHotels);
router.get('/compare', searchController.compareHotels);

export default router;