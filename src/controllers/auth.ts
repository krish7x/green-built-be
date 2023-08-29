import jwt from 'jsonwebtoken'
import { Request, Response } from 'express'
import { validationResult as validate } from 'express-validator'
import { isEmpty, omit } from 'lodash'
import { authenticate, hashPassword } from '../helpers/auth'
import { prisma } from '../prisma/index'
import { loggerUtil as logger } from '../utils/logger'
import { statusCode as SC } from '../utils/statusCode'
import { Gender } from '../@types/enum'
import nodemailer from 'nodemailer'

export const signup = async (req: Request, res: Response): Promise<any> => {
	const errors = validate(req) || []
	if (!errors.isEmpty()) {
		return res.status(SC.WRONG_ENTITY).json({
			error: errors.array()[0]?.msg
		})
	}
	const { name, email, phoneNumber = null, password } = req.body
	const otherFields = omit(req.body, 'password')
	const userType = req.query?.userType
	try {
		await prisma.user
			.create({
				data: {
					name,
					email,
					phoneNumber,
					gender: req.body?.gender || Gender.MALE,
					dateOfBirth: req.body?.dataOfBirth || '',
					encrypted_password: hashPassword(password, process.env.SALT || ''),
					role: userType && userType === '2' ? 2 : 1,
					...otherFields
				}
			})
			.then(user => {
				return res.status(SC.OK).json({
					message: 'User Signed Up, Successfully!',
					data: user
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.BAD_REQUEST).json({
					error: 'Failed to add user in DB!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Sign up API called by user - ${email}`)
	}
}

export const signin = async (req: Request, res: Response): Promise<any> => {
	const errors = validate(req) || []
	if (!errors.isEmpty()) {
		return res.status(SC.WRONG_ENTITY).json({
			error: errors.array()[0]?.msg
		})
	}

	const { email, password } = req.body
	try {
		await prisma.user
			.findUnique({
				where: {
					email
				}
			})
			.then(user => {
				if (!user) {
					return res.status(SC.NOT_FOUND).json({
						error: "E-Mail doesn't exist in DB!"
					})
				}
				if (
					!authenticate(
						password,
						process.env.SALT || '',
						user.encrypted_password
					)
				) {
					return res.status(SC.UNAUTHORIZED).json({
						error: 'Oops!, E-mail and Password does not match!'
					})
				}
				const expiryTime = new Date()
				expiryTime.setMonth(expiryTime.getMonth() + 6)
				const exp = expiryTime.getTime() / 1000
				const token = jwt.sign(
					{ _id: user.id, exp: exp },
					process.env.SECRET || ''
				)
				res.cookie('Token', token, {
					expires: new Date(Date.now() + 900000),
					httpOnly: true
				})
				return res.status(SC.OK).json({
					message: 'User Logged in Successfully!',
					token,
					data: user
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.INTERNAL_SERVER_ERROR).json({
					error: 'Login failed!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Sign in API called by user - ${email}`)
	}
}

export const signout = (res: Response): void => {
	res.clearCookie('Token')
	res.status(SC.OK).json({
		message: 'User Signed Out Sucessfully!'
	})
}

export const update = async (req: Request, res: Response): Promise<any> => {
	const userId = +(req.params.userId || '0')

	const reqBody = req.body
	const { email = '', password = '' } = req.body
	try {
		if (!isEmpty(email) || !isEmpty(password)) {
			return res.status(SC.BAD_REQUEST).json({
				error: 'Cannot update email or password'
			})
		}
		await prisma.user
			.update({
				where: {
					id: userId
				},
				data: reqBody
			})
			.then(user => {
				return res.status(SC.OK).json({
					message: 'User Updated Successfully',
					data: user
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.INTERNAL_SERVER_ERROR).json({
					error: 'Login failed!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Update API called!`)
	}
}

export const approveCorporateUser = async (
	req: Request,
	res: Response
): Promise<any> => {
	try {
		const userId = +(req.params.userId || '0')
		await prisma.user
			.update({
				where: {
					id: userId
				},
				data: {
					isApproved: true
				}
			})
			.then(user => {
				return res.status(SC.OK).json({
					message: 'Coporate User has been Approved Successfully',
					data: user
				})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.INTERNAL_SERVER_ERROR).json({
					error: 'Coporate User Approval failed!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Approve Corporate User API called!`)
	}
}

export const updateUserPoints = async (
	req: Request,
	res: Response
): Promise<any> => {
	try {
		const userId = +(req.params.userId || '0')
		const points =
			typeof req.body.points === 'string'
				? +req.body.points
				: req.body.points || 0
		await prisma.user
			.findUnique({
				where: {
					id: userId
				}
			})
			.then(async user => {
				await prisma.user
					.update({
						where: {
							id: user?.id
						},
						data: {
							points: (user?.points || 0) + points,
							totalPoints: (user?.totalPoints || 0) + points
						}
					})
					.then(data => {
						return res.status(SC.OK).json({
							message: 'User points updated successfully!',
							data
						})
					})
					.catch(err => {
						logger(err, 'ERROR')
						return res.status(SC.BAD_REQUEST).json({
							error: 'Failed to update user points!'
						})
					})
			})
			.catch(err => {
				logger(err, 'ERROR')
				return res.status(SC.NOT_FOUND).json({
					error: 'No user found!'
				})
			})
	} catch (err: any) {
		logger(err, 'ERROR')
	} finally {
		logger(`Approve Corporate User API called!`)
	}
}

export const forgotPassword = async (_: any, res: Response): Promise<any> => {
	const transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 465,
		pool: true,
		secure: true,
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS
		}
	})
	let mailOptions = {
		from: '"Green Built" <verify@greenbuilt.in>',
		to: 'shuklamanasofficial@gmail.com',
		subject: 'Happy Birthday',
		text: 'New Message',
		html: `test message`
	}
	transporter
		.sendMail(mailOptions)
		.then(info => {
			res.status(SC.OK).json({
				message: 'Message sent successfully!'
			})
			logger(`Message sent: ${info.messageId}`)
		})
		.catch(error => {
			logger(error, 'ERROR')
			res.status(SC.BAD_REQUEST).json({
				error: 'Forgot Password failed!'
			})
		})
}
