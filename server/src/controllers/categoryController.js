import { query } from '../config/db.js';
import {
  listCategories,
  findCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  findCategoryByName,
} from '../models/categoryModel.js';

const parseId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const listCategoriesHandler = async (req, res, next) => {
  try {
    const categories = await listCategories();
    return res.json({ categories });
  } catch (err) {
    return next(err);
  }
};

export const createCategoryHandler = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name || name.trim() === '') {
      return res.status(400).json({ status: 400, message: 'name is required.' });
    }

    const existing = await findCategoryByName(name.trim());
    if (existing) {
      return res.status(409).json({ status: 409, message: 'Category with this name already exists.' });
    }

    const category = await createCategory({
      name: name.trim(),
      description: description?.trim() || null,
      created_by: req.user.id,
    });
    return res.status(201).json({ category });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 409, message: 'Category with this name already exists.' });
    }
    return next(err);
  }
};

export const updateCategoryHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid category id.' });
    }

    const existing = await findCategoryById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Category not found.' });
    }

    const { name, description } = req.body || {};
    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ status: 400, message: 'name cannot be empty.' });
    }

    const category = await updateCategory(id, {
      name: name?.trim(),
      description: description?.trim(),
    });
    return res.json({ category });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 409, message: 'Category with this name already exists.' });
    }
    return next(err);
  }
};

export const deleteCategoryHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid category id.' });
    }

    const existing = await findCategoryById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Category not found.' });
    }

    // Per spec (Task 37 + DATABASE_SCHEMA.sql ON DELETE SET NULL):
    // deleting a category leaves media intact with category_id → NULL.
    await deleteCategory(id);
    return res.json({ message: 'Category deleted.' });
  } catch (err) {
    return next(err);
  }
};

export default {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
};
