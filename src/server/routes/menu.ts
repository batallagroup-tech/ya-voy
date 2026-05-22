import { Router, Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

async function getRestaurantId(userId: string) {
  const rows = await sql`SELECT id FROM restaurants WHERE clerk_user_id = ${userId} LIMIT 1`;
  return (rows[0]?.id as string) ?? null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    if (!rid) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json(await sql`SELECT * FROM menu_items WHERE restaurant_id=${rid} ORDER BY category, name`);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    if (!rid) return res.status(404).json({ error: 'Restaurante no encontrado' });
    const { name, description, price, category, image_url, available = true } = req.body;
    const [item] = await sql`
      INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url, available)
      VALUES (${rid}, ${name}, ${description}, ${price}, ${category}, ${image_url}, ${available})
      RETURNING *`;
    res.status(201).json(item);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    const { name, description, price, category, image_url, available } = req.body;
    const [item] = await sql`
      UPDATE menu_items
      SET name=${name}, description=${description}, price=${price},
          category=${category}, image_url=${image_url}, available=${available}, updated_at=NOW()
      WHERE id=${req.params.id} AND restaurant_id=${rid} RETURNING *`;
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(item);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    await sql`DELETE FROM menu_items WHERE id=${req.params.id} AND restaurant_id=${rid}`;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
