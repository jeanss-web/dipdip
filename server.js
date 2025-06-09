require('dotenv').config()
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
	dialect: 'postgres',
	logging: false,
	dialectOptions: {
		ssl:
			process.env.NODE_ENV === 'production'
				? {
						require: true,
						rejectUnauthorized: false,
				  }
				: false,
	},
})

// User Model
const User = sequelize.define(
	'User',
	{
		username: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		phone: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		isAdmin: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	},
	{
		tableName: 'users',
		timestamps: true,
	}
)
async function checkAdmin(req, res, next) {
	// Get admin token from headers (case insensitive)
	const adminToken = req.headers.admintoken || req.headers.adminToken
	console.log('Headers received:', req.headers)
	console.log('Admin token from headers:', adminToken)

	if (!adminToken) {
		console.log('No admin token provided in headers')
		return res
			.status(403)
			.json({ success: false, error: 'No admin token provided' })
	}

	try {
		// Clean phone number (remove all non-digits except +)
		const cleanPhone = adminToken.replace(/[^\d+]/g, '')
		console.log('Cleaned phone number:', cleanPhone)

		const admin = await User.findOne({
			where: { phone: cleanPhone, isAdmin: true },
		})
		
		console.log('Admin search result:', admin ? {
			id: admin.id,
			username: admin.username,
			phone: admin.phone,
			isAdmin: admin.isAdmin
		} : 'No admin found')

		if (!admin) {
			console.log('Invalid admin credentials - no matching admin found')
			return res
				.status(403)
				.json({ success: false, error: 'Invalid admin credentials' })
		}

		req.admin = admin
		next()
		console.log('Admin check passed successfully')
	} catch (error) {
		console.error('Error in checkAdmin:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error during admin check'
		})
	}
}

// Evaluation Model
const Evaluation = sequelize.define(
	'Evaluation',
	{
		userId: {
			type: DataTypes.INTEGER,
			references: {
				model: User,
				key: 'id',
			},
			allowNull: false,
		},
		productName: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		responses: {
			type: DataTypes.JSON,
			allowNull: false,
		},
		overallRating: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
	},
	{
		tableName: 'evaluations',
		timestamps: true,
	}
)

// Associations
User.hasMany(Evaluation, { foreignKey: 'userId' })
Evaluation.belongsTo(User, { foreignKey: 'userId' })

// Products data (based on beton-30.ru)
const products = [
	'Бетон М100',
	'Бетон М150',
	'Бетон М200',
	'Бетон М250',
	'Бетон М300',
	'Бетон М350',
	'Бетон М400',
	'Цементный раствор',
	'Керамзитобетон',
	'Пескобетон',
	'Тротуарная плитка',
	'Бордюрный камень',
	'Железобетонные изделия',
	'Доставка бетона',
]

// Questionnaire questions
const questions = [
	{
		id: 1,
		question: 'Как вы оцениваете качество продукции?',
		type: 'rating',
		options: [1, 2, 3, 4, 5],
	},
	{
		id: 2,
		question: 'Соответствовала ли продукция заявленным характеристикам?',
		type: 'choice',
		options: [
			'Полностью соответствовала',
			'Частично соответствовала',
			'Не соответствовала',
		],
	},
	{
		id: 3,
		question: 'Как вы оцениваете скорость доставки?',
		type: 'rating',
		options: [1, 2, 3, 4, 5],
	},
	{
		id: 4,
		question: 'Качество обслуживания менеджеров',
		type: 'rating',
		options: [1, 2, 3, 4, 5],
	},
	{
		id: 5,
		question: 'Рекомендовали бы нашу компанию друзьям?',
		type: 'choice',
		options: [
			'Определенно да',
			'Скорее да',
			'Не знаю',
			'Скорее нет',
			'Определенно нет',
		],
	},
	{
		id: 6,
		question: 'Что можно улучшить в нашей работе?',
		type: 'text',
		options: [],
	},
]

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Main page
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Authentication endpoint
app.post('/api/auth', async (req, res) => {
    try {
        const { username, phone } = req.body

        if (!username || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Username and phone are required',
            })
        }

        // Clean phone number (remove all non-digits except +)
        const cleanPhone = phone.replace(/[^\d+]/g, '')
        console.log('Attempting to create/find user with phone:', cleanPhone)

        const [user, created] = await User.findOrCreate({
            where: { phone: cleanPhone },
            defaults: { username: username.trim(), phone: cleanPhone },
        })

        console.log('User operation result:', { created, userId: user.id })

        res.json({
            success: true,
            userId: user.id,
            message: created
                ? 'User created successfully'
                : 'User logged in successfully',
        })
    } catch (error) {
        console.error('Auth error details:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
        })
        res.status(500).json({
            success: false,
            error: 'Database error during authentication',
            details: error.message
        })
    }
})

// Get products
app.get('/api/products', (req, res) => {
	try {
		res.json({ success: true, products })
	} catch (error) {
		console.error('Products error:', error)
		res.status(500).json({ success: false, error: 'Failed to load products' })
	}
})

// Get questions
app.get('/api/questions', (req, res) => {
	try {
		res.json({ success: true, questions })
	} catch (error) {
		console.error('Questions error:', error)
		res.status(500).json({ success: false, error: 'Failed to load questions' })
	}
})

app.get('/api/admin/evaluations', checkAdmin, async (req, res) => {
	try {
		const evaluations = await Evaluation.findAll({
			include: [{ model: User, attributes: ['username', 'phone'] }],
			order: [['createdAt', 'DESC']],
		})

		res.json({ success: true, evaluations })
	} catch (error) {
		console.error('Admin eval fetch error:', error)
		res
			.status(500)
			.json({ success: false, error: 'Failed to fetch evaluations' })
	}
})

// Get all users (for debugging)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'phone', 'isAdmin', 'createdAt']
        });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// Submit evaluation
app.post('/api/evaluate', async (req, res) => {
	try {
		const { userId, productName, responses, overallRating } = req.body

		if (!userId || !productName || !responses || !overallRating) {
			return res.status(400).json({
				success: false,
				error: 'All fields are required',
			})
		}

		// Verify user exists
		const user = await User.findByPk(userId)
		if (!user) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			})
		}

		const evaluation = await Evaluation.create({
			userId,
			productName,
			responses,
			overallRating: parseInt(overallRating),
		})

		// Generate report
		const reportData = generateReportText({
			user: {
				username: user.username,
				phone: user.phone,
			},
			product: productName,
			evaluation: responses,
			overallRating,
			date: new Date().toISOString(),
		})

		res.json({
			success: true,
			evaluationId: evaluation.id,
			reportData: reportData,
		})
	} catch (error) {
		console.error('Evaluation error:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to save evaluation',
		})
	}
})

// Generate report text
function generateReportText(data) {
	let report = `ОТЧЕТ ПО ОЦЕНКЕ ПРОДУКЦИИ БЕТОН-30\n`
	report += `========================================\n\n`
	report += `Пользователь: ${data.user.username}\n`
	report += `Телефон: ${data.user.phone}\n`
	report += `Продукт: ${data.product}\n`
	report += `Дата оценки: ${new Date(data.date).toLocaleString('ru-RU')}\n`
	report += `Общая оценка: ${data.overallRating}/5\n\n`
	report += `ОТВЕТЫ НА ВОПРОСЫ:\n`
	report += `==================\n\n`

	questions.forEach((question, index) => {
		const response = data.evaluation[`question_${question.id}`]
		if (response !== undefined && response !== '') {
			report += `${index + 1}. ${question.question}\n`
			report += `   Ответ: ${response}\n\n`
		}
	})

	report += `\nСпасибо за оценку!\n`
	report += `Компания БЕТОН-30 - ваш надежный партнер\n`
	report += `Сайт: https://www.beton-30.ru/\n`

	return report
}

// Check admin status
app.get('/api/check-admin/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const user = await User.findOne({
            where: { phone: phone }
        });
        
        if (!user) {
            return res.json({ 
                success: false, 
                error: 'User not found',
                isAdmin: false 
            });
        }

        res.json({ 
            success: true, 
            isAdmin: user.isAdmin,
            userId: user.id,
            username: user.username
        });
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to check admin status',
            isAdmin: false 
        });
    }
});

// Update admin status
app.post('/api/update-admin', async (req, res) => {
    try {
        const { phone, isAdmin } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const user = await User.findOne({
            where: { phone: phone }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        await user.update({ isAdmin: isAdmin });

        res.json({
            success: true,
            message: `Admin status updated for user ${user.username}`,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Error updating admin status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update admin status'
        });
    }
});

// Delete evaluation
app.delete('/api/admin/evaluations/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const evaluation = await Evaluation.findByPk(id);
        
        if (!evaluation) {
            return res.status(404).json({
                success: false,
                error: 'Evaluation not found'
            });
        }

        await evaluation.destroy();
        res.json({
            success: true,
            message: 'Evaluation deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting evaluation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete evaluation'
        });
    }
});

// Download evaluation report
app.get('/api/admin/evaluations/:id/report', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const evaluation = await Evaluation.findOne({
            where: { id },
            include: [{ model: User, attributes: ['username', 'phone'] }]
        });

        if (!evaluation) {
            return res.status(404).json({
                success: false,
                error: 'Evaluation not found'
            });
        }

        const reportData = generateReportText({
            user: {
                username: evaluation.User.username,
                phone: evaluation.User.phone,
            },
            product: evaluation.productName,
            evaluation: evaluation.responses,
            overallRating: evaluation.overallRating,
            date: evaluation.createdAt,
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=evaluation-${id}.txt`);
        res.send(reportData);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err)
	res.status(500).json({
		success: false,
		error: 'Internal server error',
	})
})

// 404 handler
app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: 'Route not found',
	})
})

// Initialize database and start server
async function startServer() {
	try {
		console.log('Connecting to database...')
		await sequelize.authenticate()
		console.log('✅ Database connected successfully')

		console.log('Synchronizing database...')
		await sequelize.sync({ alter: true })
		console.log('✅ Database synchronized')

		app.listen(PORT, '0.0.0.0', () => {
			console.log(`🚀 Server running on port ${PORT}`)
			console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
			console.log(`🌐 Health check: http://localhost:${PORT}/health`)
		})
	} catch (error) {
		console.error('❌ Unable to start server:', error)
		process.exit(1)
	}
}

startServer()
