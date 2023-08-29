import { createMany, getAllByQuery } from './../helpers/crud'
import { Request, Response } from 'express'
import { prisma } from '../prisma/index'
import { loggerUtil as logger } from '../utils/logger'
import { statusCode as SC } from '../utils/statusCode'
import { v4 as uuid } from 'uuid'

import { deleteById, getById, getAllById, getAll } from '../helpers/crud'
import { forIn, isEmpty } from 'lodash'

export const createMonthlyConsumptionPlan = async (
	req: any,
	res: Response
): Promise<any> => {
	const userId = +(req.auth._id || '0')
	const info: any = req.body.info
	const monthlyPlanData: any[] = req.body.data
	const data: any = {
		monthlyPlanId: uuid(),
		userId
	}
	try {
		const finalData: any[] = []
		monthlyPlanData?.forEach(val => {
			const obj = {
				monthlyPlanId: data.monthlyPlanId,
				userId,
				date: +info?.date || new Date().getDate(),
				month: +info?.month || new Date().getMonth() + 1,
				year: +info?.year || new Date().getFullYear(),
				fullDate: info?.fullDate ? val?.fullDate : new Date(),
				sourceType: val?.sourceType,
				ownCaptive: val?.ownCaptive || 0,
				groupCaptive: val?.groupCaptive || 0,
				thirdPartyPurchase: val?.thirdPartyPurchase || 0,
				total:
					(val.ownCaptive || 0) +
					(val.groupCaptive || 0) +
					(val.thirdPartyPurchase || 0)
			}
			finalData.push(obj)
		})
		const queryObj = {
			month: +info?.month,
			year: +info?.year,
			userId
		}
		await getAllByQuery(prisma.montlyConsumptionPlan, queryObj).then(
			async val => {
				if (!val.length) {
					await createMany(prisma.montlyConsumptionPlan, finalData)
						.then(count => {
							res.status(SC.OK).json({
								message: 'Monthly consumption plan created sucessfully!',
								count,
								data: finalData
							})
						})
						.catch(err => {
							logger(err, 'ERROR')
							res.status(SC.BAD_REQUEST).json({
								error: 'Error while creating monthly consumption plan'
							})
						})
				} else {
					res.status(SC.BAD_REQUEST).json({
						error:
							'Monthly plan data for this month is already present for the user!'
					})
				}
			}
		)
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Create Monthly Consumption Plan API Called!`)
	}
}

export const updateMonthlyConsumptionPlan = async (
	req: Request,
	res: Response
): Promise<any> => {
	const id = +(req.params.monthlyPlanId || '0')
	try {
		await prisma.montlyConsumptionPlan
			.update({
				where: {
					id
				},
				data: {
					...req.body.data
				}
			})
			.then(data => {
				res.status(SC.OK).json({
					message:
						'Monthly consumption plan with source type updated sucessfully!',
					data: data
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while updating monthly plan with source type'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Update Monthly Consumption Plan API Called!`)
	}
}

export const approveMonthlyConsumptionPlan = async (
	req: Request,
	res: Response
): Promise<any> => {
	const monthlyPlanId = req.params.monthlyPlanId

	try {
		await prisma.montlyConsumptionPlan
			.findMany({
				where: {
					monthlyPlanId
				}
			})
			.then(async monthlyPlan => {
				let total = 0
				monthlyPlan?.forEach(data => (total += data.total || 0))
				await prisma.user
					.findFirst({
						where: {
							id: monthlyPlan[0]?.userId
						}
					})
					.then(async user => {
						await prisma.user.update({
							where: {
								id: monthlyPlan[0]?.userId
							},
							data: {
								points: (user?.points || 0) + total
							}
						})
					})
					.then(async () => {
						await prisma.montlyConsumptionPlan
							.updateMany({
								where: {
									monthlyPlanId
								},
								data: {
									isApproved: true
								}
							})
							.then(data => {
								res.status(SC.OK).json({
									message:
										'Monthly consumption plan has been approved sucessfully!',
									data: data
								})
							})
							.catch(err => {
								logger(err, 'ERROR')
								res.status(SC.BAD_REQUEST).json({
									error:
										'Error while approving monthly consumption plan with source type'
								})
							})
					})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Approve Monthly Consumption Plan with Source API Called!`)
	}
}

export const deleteByMonthlyConsumptionPlanId = async (
	req: any,
	res: Response
): Promise<any> => {
	const monthlyPlanId = req.params.monthlyPlanId
	try {
		await prisma.montlyConsumptionPlan
			.deleteMany({
				where: {
					monthlyPlanId
				}
			})
			.then(data => {
				res.status(SC.OK).json({
					message: 'Monthly consumption plan deleted sucessfully!',
					data: data
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while deleting monthly consumption plan'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Delete By Monthly Consumption Plan Id API Called!`)
	}
}

export const deleteMonthlyConsumptionById = async (
	req: Request,
	res: Response
): Promise<any> => {
	const id = +(req.params.monthlyPlanId || '0')
	try {
		await deleteById(prisma.montlyConsumptionPlan, 'id', id)
			.then(data => {
				res.status(SC.OK).json({
					message: 'Monthly consumption plan deleted sucessfully!',
					data: data
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while deleting monthly consumption plan'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Delete By Id Monthly Consumption Plan API Called!`)
	}
}

export const getMonthlyConsumptionById = async (
	req: Request,
	res: Response
): Promise<any> => {
	const id = +(req.params.monthlyPlanId || '0')
	try {
		await getById(prisma.montlyConsumptionPlan, 'id', id)
			.then(data => {
				if (isEmpty(data)) {
					res.status(SC.NOT_FOUND).json({
						message: 'No plans found!'
					})
				} else {
					res.status(SC.OK).json({
						message: 'Monthly product plan fetched sucessfully!',
						data: data
					})
				}
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while fecthing monthly product plan'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get By Monthly Plan Consumption Id API Called!`)
	}
}

export const getAllByMonthlyConsumptionId = async (
	req: Request,
	res: Response
): Promise<any> => {
	const monthlyPlanId = req.params.monthlyPlanId
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	try {
		await getAllById(
			prisma.montlyConsumptionPlan,
			'monthlyPlanId',
			monthlyPlanId,
			take,
			skip
		)
			.then(data => {
				const finalObj: any = { monthlyPlans: [] }
				if (isEmpty(data)) {
					res.status(SC.NOT_FOUND).json({
						message: 'No plans found!'
					})
				} else {
					let total = 0
					data.forEach((val: any, inx: number) => {
						total += val?.total
						if (inx === 0) {
							finalObj.monthlyPlanId = val.monthlyPlanId
							finalObj.month = val.month
							finalObj.date = val.date
							finalObj.year = val.year
							finalObj.fullDate = val.fullDate
							finalObj.userId = val.userId
							finalObj.monthlyPlans = [
								{
									id: val.id,
									ownCaptive: val.ownCaptive,
									groupCaptive: val.groupCaptive,
									thirdPartyPurchase: val.thirdPartyPurchase,
									total: val.total,
									isApproved: val.isApproved,
									isTrash: val.isTrash,
									sourceType: val.sourceType
								},
								...finalObj.monthlyPlans
							]
						} else {
							finalObj.monthlyPlans = [
								{
									id: val.id,
									ownCaptive: val.ownCaptive,
									groupCaptive: val.groupCaptive,
									thirdPartyPurchase: val.thirdPartyPurchase,
									total: val.total,
									isApproved: val.isApproved,
									isTrash: val.isTrash,
									sourceType: val.sourceType
								},
								...finalObj.monthlyPlans
							]
						}
					})
					res.status(SC.OK).json({
						message: 'Monthly consumption plans fetched sucessfully!',
						data: {
							...finalObj,
							total
						}
					})
				}
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while fecthing monthly consumption plans'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get By Monthly Cosumption API Called!`)
	}
}

export const getAllMonthlyConsumptionByUserId = async (
	req: Request,
	res: Response
): Promise<any> => {
	const userId = +(req.params.userId || '0')
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	try {
		await getAllById(prisma.montlyConsumptionPlan, 'userId', userId, take, skip)
			.then(data => {
				const reducedData = data?.reduce((r: any, acc: any) => {
					r[acc.monthlyPlanId] = r[acc.monthlyPlanId] || []
					r[acc.monthlyPlanId].push(acc)
					return r
				}, Object.create(null))

				if (isEmpty(data)) {
					res.status(SC.NOT_FOUND).json({
						message: 'No plans found!'
					})
				} else {
					const finalData: any[] = []
					let obj: any = {}
					let total = 0
					forIn(reducedData, val => {
						const tempObj: any = {}
						let monthlyPlans: any[] = []
						val?.forEach((data: any, inx: number) => {
							if (inx === 0) {
								tempObj.monthlyPlanId = data?.monthlyPlanId
								tempObj.userId = data?.userId
								tempObj.month = data?.month
								tempObj.year = data?.year
								tempObj.date = data?.date
								tempObj.fullDate = data?.fullDate
							}
							monthlyPlans.push({
								ownCaptive: data?.ownCaptive,
								groupCaptive: data?.groupCaptive,
								thirdPartyPurchase: data?.thirdPartyPurchase,
								total: data?.total,
								isApproved: data?.isApproved,
								isTrash: data?.isTrash,
								sourceType: data?.sourceType
							})
							total += data?.total
						})
						tempObj.toal = total
						tempObj.monthlyPlans = monthlyPlans
						obj = { ...obj, ...tempObj }
						finalData.push(obj)
						monthlyPlans = []
						total = 0
					})
					res.status(SC.OK).json({
						message: 'Monthly consumption plans fetched sucessfully!',
						data: finalData
					})
				}
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while fecthing user monthly consumption plan'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get Monthly Consumption By User API Called!`)
	}
}

export const getAllMonthlyConsumption = async (
	req: Request,
	res: Response
): Promise<any> => {
	const take = +(req.query.limit || '10'),
		skip = +(req.query.offset || '0')
	try {
		await getAll(prisma.montlyConsumptionPlan, take, skip)
			.then(data => {
				const reducedData = data?.reduce((r: any, acc: any) => {
					r[acc.monthlyPlanId] = r[acc.monthlyPlanId] || []
					r[acc.monthlyPlanId].push(acc)
					return r
				}, Object.create(null))

				if (isEmpty(data)) {
					res.status(SC.NOT_FOUND).json({
						message: 'No plans found!'
					})
				} else {
					const finalData: any[] = []
					let obj: any = {}
					let total = 0
					forIn(reducedData, val => {
						const tempObj: any = {}
						let monthlyPlans: any[] = []
						val?.forEach((data: any, inx: number) => {
							if (inx === 0) {
								tempObj.monthlyPlanId = data?.monthlyPlanId
								tempObj.userId = data?.userId
								tempObj.month = data?.month
								tempObj.year = data?.year
								tempObj.date = data?.date
								tempObj.fullDate = data?.fullDate
							}
							monthlyPlans.push({
								ownCaptive: data?.ownCaptive,
								groupCaptive: data?.groupCaptive,
								thirdPartyPurchase: data?.thirdPartyPurchase,
								total: data?.total,
								isApproved: data?.isApproved,
								isTrash: data?.isTrash,
								sourceType: data?.sourceType
							})
							total += data?.total
						})
						tempObj.toal = total
						tempObj.monthlyPlans = monthlyPlans
						obj = { ...obj, ...tempObj }
						finalData.push(obj)
						monthlyPlans = []
						total = 0
					})
					res.status(SC.OK).json({
						message: 'Monthly consumption plans fetched sucessfully!',
						data: finalData
					})
				}
			})
			.catch(err => {
				logger(err, 'ERROR')
				res.status(SC.BAD_REQUEST).json({
					error: 'Error while fecthing monthly consumption plans'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Get All Monthly Consumptions API Called!`)
	}
}
