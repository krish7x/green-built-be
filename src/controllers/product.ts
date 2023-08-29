import { generateDocumentId } from './../utils/generateId'
import { Request, Response } from 'express'
import { prisma } from '../prisma/index'
import { loggerUtil as logger } from '../utils/logger'
import { statusCode as SC } from '../utils/statusCode'
import { v4 as uuid } from 'uuid'
import {
	create,
	createMany,
	deleteById,
	getAll,
	getAllById,
	getById,
	updateById
} from '../helpers/crud'

interface Product {
	title: string
	industryType: string
	packagingType?: string
	uom: string
	description?: string
	points: number
	photo?: string
	productId: string
	productCode: String
	userId: number
}

export const createProduct = async (req: any, res: Response): Promise<any> => {
	const userId = req.auth._id
	const product: Product = req.body.product
	const data = {
		...product,
		productId: uuid(),
		userId
	}
	try {
		await prisma.product
			.count({
				where: {
					industryType: product.industryType
				}
			})
			.then(async count => {
				const prefix = product.industryType?.substring(0, 3)?.toUpperCase()
				const finalData = {
					...data,
					productCode: prefix + generateDocumentId(count, 4)
				}
				await create(prisma.product, finalData).then(async data => {
					await prisma.notification
						.create({
							data: {
								notificationId: uuid(),
								date: new Date().getDate(),
								month: new Date().getMonth() + 1,
								year: new Date().getFullYear(),
								fullDate: new Date(),
								text: `Product - ${product.title} has been created!`,
								userId
							}
						})
						.then(() => {
							return res.status(SC.OK).json({
								message: 'Product created successfully!',
								data
							})
						})
						.catch(err => {
							logger(err, 'ERROR')
							return res.status(SC.BAD_REQUEST).json({
								error: 'Product creation failed!'
							})
						})
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Create Product API Called!`)
	}
}

export const bulkUpload = async (req: any, res: Response): Promise<any> => {
	const userId = req.auth._id
	const products: Product[] = req.body.products
	const data = products?.map(val => ({ ...val, productId: uuid(), userId }))
	try {
		await createMany(prisma.product, data)
			.then(data => {
				return res.status(SC.OK).json({
					message: 'Products updated in bulk successfully!',
					data
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Products upload failed!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Bulk upload Product API Called!`)
	}
}

export const deleteProduct = async (
	req: Request,
	res: Response
): Promise<any> => {
	const productId = req.params.productId
	try {
		await deleteById(prisma.product, 'productId', productId)
			.then(data => {
				return res.status(SC.OK).json({
					message: 'Product deleted successfully!',
					data
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Product deletion failed!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Delete Product API Called!`)
	}
}

export const getProduct = async (req: Request, res: Response): Promise<any> => {
	const productId = req.params.productId
	try {
		await getById(prisma.product, 'productId', productId)
			.then(data => {
				return res.status(SC.OK).json({
					message: 'Corporate Product fetched successfully!',
					data
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Failed to fetch the corporate product!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get Corporate Product API Called!`)
	}
}

export const getAllCorporateProducts = async (
	req: any,
	res: Response
): Promise<any> => {
	const userId = req.auth._id
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	try {
		await getAllById(prisma.product, 'userId', userId, take, skip)
			.then(data => {
				return res.status(SC.OK).json({
					message: 'Corporate Products fetched successfully!',
					data,
					pagination: {
						limit: take,
						offset: skip
					}
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Failed to fetch the corporate products!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get All Corporate Products API Called!`)
	}
}

export const getAllProducts = async (
	req: Request,
	res: Response
): Promise<any> => {
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	try {
		await getAll(prisma.product, take, skip)
			.then(data => {
				return res.status(SC.OK).json({
					message: 'All Products fetched successfully!',
					data,
					pagination: {
						limit: take,
						offset: skip
					}
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Failed to fetch the products!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get All Products API Called!`)
	}
}

export const approveProduct = async (
	req: Request,
	res: Response
): Promise<any> => {
	const productId = req.params.productId
	const data = {
		isApproved: true
	}
	try {
		await updateById(prisma.product, data, 'productId', productId).then(
			async data => {
				await prisma.notification
					.create({
						data: {
							notificationId: uuid(),
							date: new Date().getDate(),
							month: new Date().getMonth() + 1,
							year: new Date().getFullYear(),
							fullDate: new Date(),
							text: `Product - ${data.title} has been approved!`,
							userId: data?.userId
						}
					})
					.then(() => {
						return res.status(SC.OK).json({
							message: 'Product approved successfully!',
							data
						})
					})
					.catch(err => {
						logger(err, 'ERROR')
						return res.status(SC.BAD_REQUEST).json({
							error: 'Product approval failed!'
						})
					})
			}
		)
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Approve Product API Called!`)
	}
}

export const updateProductPoints = async (
	req: Request,
	res: Response
): Promise<any> => {
	const productId = req.params.productId
	const points =
		typeof req.body.points === 'string'
			? +req.body.points
			: req.body.points || 0

	try {
		await getById(prisma.product, 'productId', productId)
			.then(async product => {
				const data = {
					points: (product?.points || 0) + points
				}
				await updateById(prisma.product, data, 'id', product?.id)
					.then(data => {
						return res.status(SC.OK).json({
							message: 'Product approved successfully!',
							data
						})
					})
					.catch(err => {
						logger(err, 'ERROR')
						return res.status(SC.BAD_REQUEST).json({
							error: 'Product approval failed!'
						})
					})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.NOT_FOUND).json({
					error: 'NO product found!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Approve Product API Called!`)
	}
}

export const getAllProductsByQuery = async (
	req: Request,
	res: Response
): Promise<any> => {
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	const queryFromArray = +(req.query.queryFromArray || '0')
	const query = req.body
	try {
		if (!queryFromArray) {
			await prisma.product
				.findMany({
					where: {
						...query
					},
					take,
					skip
				})
				.then(data => {
					return res.status(SC.OK).json({
						message: 'All Products fetched successfully!',
						data,
						pagination: {
							limit: take,
							offset: skip
						}
					})
				})
				.catch(err => {
					logger(err, 'ERROR')
					return res.status(SC.BAD_REQUEST).json({
						error: 'Failed to fetch the products!'
					})
				})
		} else {
			await prisma.product
				.findMany({
					where: {
						uom: {
							in: req.body.uom || []
						},
						packagingType: {
							hasSome: req.body.packagingType || []
						},
						industryType: {
							in: req.body.industryType || []
						}
					}
				})
				.then(data => {
					return res.status(SC.OK).json({
						message: 'All Products fetched successfully!',
						data,
						pagination: {
							limit: take,
							offset: skip
						}
					})
				})
				.catch(err => {
					logger(err, 'ERROR')
					return res.status(SC.BAD_REQUEST).json({
						error: 'Failed to fetch the products!'
					})
				})
		}
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get All Products API Called!`)
	}
}

export const getProductsBySearchTerm = async (
	req: any,
	res: Response
): Promise<any> => {
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	const userId = +(req.auth._id || '')
	const { key = '', value = '' } = req.body
	try {
		await prisma.product
			.findMany({
				where: {
					[key]: {
						contains: value,
						mode: 'insensitive'
					},
					userId
				},
				take,
				skip
			})
			.then(data => {
				return res.status(SC.OK).json({
					message: 'All Products fetched successfully!',
					data,
					pagination: {
						limit: take,
						offset: skip
					}
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Failed to fetch the products!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get All Products API Called!`)
	}
}
