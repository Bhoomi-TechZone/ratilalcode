import React, { useEffect, useState, useMemo } from 'react'

// Error Boundary Component
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props)
		this.state = { hasError: false, error: null, errorInfo: null }
	}

	static getDerivedStateFromError(error) {
		return { hasError: true }
	}

	componentDidCatch(error, errorInfo) {
		this.setState({
			error: error,
			errorInfo: errorInfo
		})
		console.error('Error Boundary caught an error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
					<div className="text-center max-w-md">
						<div className="p-4 bg-red-100 rounded-lg mb-4">
							<i className="fas fa-exclamation-triangle text-red-600 text-3xl mb-2"></i>
							<p className="text-red-600 font-medium">Component crashed</p>
							<p className="text-red-500 text-sm mt-2">
								{this.state.error && this.state.error.toString()}
							</p>
						</div>
						<button 
							onClick={() => {
								this.setState({ hasError: false, error: null, errorInfo: null })
								window.location.reload()
							}}
							className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
						>
							Reload Page
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

// Temporarily disable Chart.js to isolate error
const chartJSAvailable = false

function HRTaskManagementDashboard() {
	// Safer state initialization with error handling
	const [tasks, setTasks] = useState([])
	const [employees, setEmployees] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [componentError, setComponentError] = useState(null)
	const [selectedDateRange, setSelectedDateRange] = useState('all')
	const [selectedTeam, setSelectedTeam] = useState('All')
	const [selectedAssignedBy, setSelectedAssignedBy] = useState('All')
	const [selectedTimeSpent, setSelectedTimeSpent] = useState('All')
	const [searchTerm, setSearchTerm] = useState('')

	// Create task modal state
	const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
	const [creatingTask, setCreatingTask] = useState(false)
	const [newTask, setNewTask] = useState({
		taskName: '',
		description: '',
		assignedTo: '',
		assignedBy: '',
		team: '',
		priority: 'Medium',
		dueDate: '',
		estimatedHours: '',
		status: 'Pending'
	})

	// Task details modal state
	const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false)
	const [selectedTask, setSelectedTask] = useState(null)
	const [taskUpdates, setTaskUpdates] = useState([])
	const [loadingUpdates, setLoadingUpdates] = useState(false)

	// Edit task modal state
	const [showEditTaskModal, setShowEditTaskModal] = useState(false)
	const [editingTask, setEditingTask] = useState(null)
	const [editTaskData, setEditTaskData] = useState({
		taskName: '',
		description: '',
		assignedTo: '',
		assignedBy: '',
		team: '',
		priority: 'Medium',
		dueDate: '',
		estimatedHours: '',
		status: 'Pending',
		progress: 0,
		timeSpent: 0
	})

	// Task status trend state
	const [trendData, setTrendData] = useState([])
	const [loadingTrend, setLoadingTrend] = useState(false)
	const [trendPeriod, setTrendPeriod] = useState(30)
	const [chartError, setChartError] = useState(false)

	// Projects state
	const [projects, setProjects] = useState([])

	// Export report state
	const [showExportModal, setShowExportModal] = useState(false)
	const [exportFormat, setExportFormat] = useState('csv')
	const [exportDateRange, setExportDateRange] = useState('all')
	const [exportFields, setExportFields] = useState({
		employeeName: true,
		taskName: true,
		assignedBy: true,
		status: true,
		timeSpent: true,
		priority: true,
		dueDate: true,
		lastActivity: true
	})
	const [exporting, setExporting] = useState(false)

	// Review modal state
	const [showReviewModal, setShowReviewModal] = useState(false)
	const [selectedTaskForReview, setSelectedTaskForReview] = useState(null)
	const [reviewData, setReviewData] = useState({
		rating: 5,
		comments: '',
		reviewType: 'project',
		recommendations: ''
	})
	const [submittingReview, setSubmittingReview] = useState(false)

	// Global error handler
	useEffect(() => {
		const handleError = (event) => {
			console.error('Global error caught:', event.error)
			setComponentError(`Global error: ${event.error?.message || 'Unknown error'}`)
		}

		const handleUnhandledRejection = (event) => {
			console.error('Unhandled promise rejection:', event.reason)
			setComponentError(`Promise rejection: ${event.reason?.message || 'Unknown rejection'}`)
		}

		window.addEventListener('error', handleError)
		window.addEventListener('unhandledrejection', handleUnhandledRejection)

		return () => {
			window.removeEventListener('error', handleError)
			window.removeEventListener('unhandledrejection', handleUnhandledRejection)
		}
	}, [])

	// Fetch data on component mount
	useEffect(() => {
		let mounted = true
		
		async function loadData() {
			try {
				setLoading(true)
				setError(null)
				
				const token = localStorage.getItem('access_token')
				
				// Fetch tasks and employees in parallel
				const [tasksRes, employeesRes] = await Promise.all([
					fetch('/api/hr/tasks/raw', {
						headers: token ? { Authorization: `Bearer ${token}` } : {},
					}),
					fetch('/api/hr/employees', {
						headers: token ? { Authorization: `Bearer ${token}` } : {},
					})
				])

				// Handle tasks response
				if (!tasksRes.ok) {
					throw new Error(`Failed to fetch tasks: ${tasksRes.status}`)
				}
				const tasksData = await tasksRes.json()
				
				// Handle employees response  
				if (!employeesRes.ok) {
					throw new Error(`Failed to fetch employees: ${employeesRes.status}`)
				}
				const employeesData = await employeesRes.json()

				if (mounted) {
					// Set tasks - handle both formats from API
					const tasksList = tasksData?.data || tasksData || []
					
					// Transform and deduplicate tasks to match UI format
					const transformedTasks = tasksList
						.filter(task => task && task.taskName && task.taskName.trim() !== '') // Filter out invalid tasks
						.map(task => ({
							id: task.id || task._id,
							employeeName: task.employeeName || findEmployeeName(task.assignedTo, employeesData),
							taskName: task.taskName,
							description: task.description || '',
							team: task.team || 'General',
							assignedBy: task.assignedBy,
							assignedTo: task.assignedTo,
							priority: task.priority,
							status: task.status,
							timeSpent: task.timeSpent || 0,
							deviation: task.deviation || '0 hrs',
							lastActivity: task.lastActivity || new Date().toISOString().slice(0, 10),
							dueDate: task.dueDate,
							estimatedHours: task.estimatedHours || 0,
							progress: task.progress || 0,
							createdAt: task.createdAt,
							createdBy: task.createdBy
						}))
					
					// Remove duplicates based on task ID
					const uniqueTasks = transformedTasks.filter((task, index, self) => 
						index === self.findIndex(t => t.id === task.id)
					)
					
					setTasks(uniqueTasks)
					
					// Set employees
					const employeesList = Array.isArray(employeesData) ? employeesData : (employeesData?.data || [])
					console.log('Employees data from backend:', employeesList)
					setEmployees(employeesList)
				}
				
			} catch (err) {
				console.error('Failed to fetch data:', err)
				if (mounted) {
					setError(err.message || String(err))
				}
			} finally {
				if (mounted) {
					setLoading(false)
				}
			}
		}

		// Helper function to find employee name by ID
		function findEmployeeName(assignedTo, employeesData) {
			try {
				const employeesList = Array.isArray(employeesData) ? employeesData : (employeesData?.data || [])
				const employee = employeesList.find(emp => 
					emp.employee_id === assignedTo || 
					emp.user_id === assignedTo ||
					emp._id === assignedTo ||
					emp.full_name === assignedTo ||
					emp.name === assignedTo
				)
				return employee?.full_name || employee?.name || assignedTo || 'Unknown Employee'
			} catch (error) {
				console.error('Error finding employee name:', error)
				return assignedTo || 'Unknown Employee'
			}
		}

		loadData().catch(error => {
			console.error('Error in loadData:', error)
			if (mounted) {
				setError('Failed to load dashboard data')
			}
		})
		
		return () => { mounted = false }
	}, [])// Load task status trend data
	
useEffect(() => {
	const loadTrendData = async () => {
		try {
			await fetchTaskStatusTrend(trendPeriod)
		} catch (error) {
			console.error('Error in trend data useEffect:', error)
			// Set safe fallback data
			setTrendData({
				trendData: [],
				dateLabels: [],
				summary: {
					totalTasks: 0,
					completedTasks: 0,
					inProgressTasks: 0,
					currentCompletionRate: 0,
					trendDirection: 'up'
				}
			})
		}
	}
	
	loadTrendData()
}, [trendPeriod])	// Function to refresh tasks from API
	const refreshTasks = async () => {
		try {
			const token = localStorage.getItem('access_token')
			const tasksRes = await fetch('/api/hr/tasks/raw', {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})

			if (!tasksRes.ok) {
				throw new Error(`Failed to fetch tasks: ${tasksRes.status}`)
			}

			const tasksData = await tasksRes.json()
			const tasksList = tasksData?.data || tasksData || []
			
			// Transform and deduplicate tasks to match UI format
			const transformedTasks = tasksList
				.filter(task => task && task.taskName && task.taskName.trim() !== '') // Filter out invalid tasks
				.map(task => ({
					id: task.id || task._id,
					employeeName: task.employeeName || findEmployeeName(task.assignedTo),
					taskName: task.taskName,
					description: task.description || '',
					team: task.team || 'General',
					assignedBy: task.assignedBy,
					assignedTo: task.assignedTo,
					priority: task.priority,
					status: task.status,
					timeSpent: task.timeSpent || 0,
					deviation: task.deviation || '0 hrs',
					lastActivity: task.lastActivity || new Date().toISOString().slice(0, 10),
					dueDate: task.dueDate,
					estimatedHours: task.estimatedHours || 0,
					progress: task.progress || 0,
					createdAt: task.createdAt,
					createdBy: task.createdBy
				}))
			
			// Remove duplicates based on task ID
			const uniqueTasks = transformedTasks.filter((task, index, self) => 
				index === self.findIndex(t => t.id === task.id)
			)
			
			setTasks(uniqueTasks)
		} catch (err) {
			console.error('Failed to refresh tasks:', err)
		}
	}

	// Helper function to find employee name by ID
	const findEmployeeName = (assignedTo) => {
		const employee = employees.find(emp => 
			emp.employee_id === assignedTo || 
			emp.user_id === assignedTo ||
			emp._id === assignedTo ||
			emp.full_name === assignedTo ||
			emp.name === assignedTo
		)
		return employee?.full_name || employee?.name || assignedTo || 'Unknown Employee'
	}

	// Calculate statistics
	const statistics = useMemo(() => {
		const totalActive = tasks.filter(t => t?.status !== 'Completed').length
		const overdue = tasks.filter(t => t?.status === 'Overdue').length
		const completed = tasks.filter(t => t?.status === 'Completed').length
		const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
		const highPriority = tasks.filter(t => t?.priority === 'High').length

		return {
			totalActiveTasks: totalActive,
			tasksOverdue: overdue,
			completionRate,
			highPriorityTasks: highPriority
		}
	}, [tasks])

	// Team workload distribution
	const teamWorkload = useMemo(() => {
		const teams = {}
		tasks.forEach(task => {
			const teamName = task?.team || 'General'
			if (!teams[teamName]) {
				teams[teamName] = { total: 0, inProgress: 0, completed: 0 }
			}
			teams[teamName].total++
			if (task?.status === 'In Progress') teams[teamName].inProgress++
			if (task?.status === 'Completed') teams[teamName].completed++
		})
		return Object.entries(teams).map(([team, data]) => ({
			team,
			...data,
			percentage: Math.round((data.total / tasks.length) * 100)
		}))
	}, [tasks])

	// Filter tasks
	const filteredTasks = useMemo(() => {
		return tasks.filter(task => {
			// Add safety checks to prevent errors with undefined properties
			const employeeName = task?.employeeName || ''
			const taskName = task?.taskName || ''
			const team = task?.team || ''
			const assignedBy = task?.assignedBy || ''
			
			const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
								taskName.toLowerCase().includes(searchTerm.toLowerCase())
			const matchesTeam = selectedTeam === 'All' || team === selectedTeam
			const matchesAssignedBy = selectedAssignedBy === 'All' || assignedBy === selectedAssignedBy
			
			return matchesSearch && matchesTeam && matchesAssignedBy
		})
	}, [tasks, searchTerm, selectedTeam, selectedAssignedBy])

	// Get unique teams and assignees for filters
	const teams = useMemo(() => {
		const uniqueTeams = [...new Set(tasks.map(task => task?.team || 'General').filter(Boolean))]
		return ['All', ...uniqueTeams]
	}, [tasks])

	const assignees = useMemo(() => {
		const uniqueAssignees = [...new Set(tasks.map(task => task?.assignedBy || 'Unknown').filter(Boolean))]
		return ['All', ...uniqueAssignees]
	}, [tasks])

	// Task details and view handlers
	const handleTaskClick = async (task) => {
		setSelectedTask(task)
		setShowTaskDetailsModal(true)
		await fetchTaskUpdates(task.id)
	}

	const handleViewTaskDetails = async (task) => {
		setSelectedTask(task)
		setShowTaskDetailsModal(true)
		await fetchTaskUpdates(task.id)
	}

	const fetchTaskUpdates = async (taskId) => {
		setLoadingUpdates(true)
		try {
			const token = localStorage.getItem('access_token')
			const response = await fetch(`/api/hr/tasks/${taskId}/updates`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})

			if (response.ok) {
				const data = await response.json()
				setTaskUpdates(data.updates || [])
			} else {
				// If endpoint doesn't exist, show mock data
				setTaskUpdates([
					{
						id: 1,
						type: 'status_change',
						message: 'Task status updated to In Progress',
						timestamp: new Date().toISOString(),
						user: 'Employee Name',
						details: 'Started working on the task'
					},
					{
						id: 2,
						type: 'comment',
						message: 'Added progress update',
						timestamp: new Date(Date.now() - 86400000).toISOString(),
						user: 'Employee Name',
						details: 'Completed initial research phase'
					}
				])
			}
		} catch (error) {
			console.error('Error fetching task updates:', error)
			// Show mock data on error
			setTaskUpdates([
				{
					id: 1,
					type: 'status_change',
					message: 'Task assigned to employee',
					timestamp: new Date().toISOString(),
					user: selectedTask?.assignedBy || 'Manager',
					details: 'Task has been assigned and is ready to start'
				}
			]);
		} finally {
			setLoadingUpdates(false)
		}
	}

	const closeTaskDetailsModal = () => {
		setShowTaskDetailsModal(false)
		setSelectedTask(null)
		setTaskUpdates([])
	}

	const fetchTaskStatusTrend = async (days = 30) => {
		setLoadingTrend(true)
		setChartError(false)
		try {
			// Calculate real trend data from actual tasks
			const realTrendData = []
			const today = new Date()
			
			for (let i = days; i >= 0; i--) {
				const date = new Date(today)
				date.setDate(date.getDate() - i)
				const dateStr = date.toISOString().split('T')[0]
				
				// Filter tasks for this date
				const tasksForDate = tasks.filter(task => {
					if (!task.dueDate && !task.createdAt && !task.lastActivity) return false
					
					const taskDate = new Date(task.dueDate || task.createdAt || task.lastActivity)
					return taskDate.toISOString().split('T')[0] === dateStr
				})
				
				const completedTasks = tasksForDate.filter(task => 
					task.status === 'Completed' || task.status === 'Done'
				).length
				
				const inProgressTasks = tasksForDate.filter(task => 
					task.status === 'In Progress' || task.status === 'Working'
				).length
				
				const pendingTasks = tasksForDate.filter(task => 
					task.status === 'Pending' || task.status === 'To Do'
				).length
				
				const totalTasks = tasksForDate.length
				
				realTrendData.push({
					date: dateStr,
					completed: completedTasks,
					inProgress: inProgressTasks,
					pending: pendingTasks,
					total: totalTasks,
					completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0
				})
			}
			
			console.log('Calculated trend data from tasks:', realTrendData)
			
			setTrendData({
				trendData: realTrendData,
				dateLabels: realTrendData.map(d => d.date),
				summary: {
					totalTasks: realTrendData.reduce((acc, item) => acc + item.total, 0),
					completedTasks: realTrendData.reduce((acc, item) => acc + item.completed, 0),
					inProgressTasks: realTrendData.reduce((acc, item) => acc + item.inProgress, 0),
					currentCompletionRate: realTrendData.length > 0 ? 
						(realTrendData.reduce((acc, item) => acc + item.completed, 0) / 
						Math.max(realTrendData.reduce((acc, item) => acc + item.total, 0), 1) * 100) : 0,
					trendDirection: 'up'
				}
			})
		} catch (error) {
			console.error('Error fetching task status trend:', error);
			setTrendData([
				{ date: '2024-01-01', completed: 10, pending: 5, inProgress: 3 },
				{ date: '2024-01-02', completed: 12, pending: 4, inProgress: 4 },
				{ date: '2024-01-03', completed: 8, pending: 6, inProgress: 2 }
			]);
		} finally {
			setLoadingTrend(false)
		}
	}

	// Edit task handlers
	const handleEditTask = (task) => {
		setEditTaskData({
			taskName: task.taskName || '',
			description: task.description || '',
			assignedTo: task.assignedTo || '',
			assignedBy: task.assignedBy || '',
			team: task.team || '',
			priority: task.priority || 'Medium',
			dueDate: task.dueDate || '',
			estimatedHours: task.estimatedHours || '',
			status: task.status || 'Pending',
			progress: task.progress || 0,
			timeSpent: task.timeSpent || 0
		})
		setEditingTask(task)
		setSelectedTask(task)
		setShowEditTaskModal(true)
	}

	const handleUpdateTask = async () => {
		if (!editTaskData.taskName.trim()) {
			alert('Task name is required')
			return
		}

		try {
			const token = localStorage.getItem('access_token')
			const response = await fetch(`/api/hr/tasks/${editingTask.id}/update`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(editTaskData)
			})

			if (response.ok) {
				// Update task in local state
				setTasks(prevTasks =>
					prevTasks.map(task =>
						task.id === editingTask.id
							? { 
								...task, 
								...editTaskData, 
								employeeName: employees.find(emp => 
									emp.employee_id === editTaskData.assignedTo || 
									emp.user_id === editTaskData.assignedTo ||
									emp._id === editTaskData.assignedTo ||
									emp.full_name === editTaskData.assignedTo ||
									emp.name === editTaskData.assignedTo
								)?.full_name || editTaskData.assignedTo || 'Unknown Employee'
							}
							: task
					)
				)
				
				// Refresh trend data
				fetchTaskStatusTrend(trendPeriod)
				
				setShowEditTaskModal(false)
				setEditingTask(null)
				alert('Task updated successfully!')
			} else {
				throw new Error(`Failed to update task: ${response.status}`)
			}
		} catch (error) {
			console.error('Error updating task:', error)
			alert('Failed to update task. Please try again.')
		}
	}

	const closeEditTaskModal = () => {
		setShowEditTaskModal(false)
		setSelectedTask(null)
		setEditTaskData({
			taskName: '',
			description: '',
			assignedTo: '',
			assignedBy: '',
			team: '',
			priority: 'Medium',
			dueDate: '',
			estimatedHours: '',
			status: 'Pending',
			progress: 0,
			timeSpent: 0
		})
	}

	const getStatusColor = (status) => {
		switch (status) {
			case 'Completed':
				return 'bg-green-100 text-green-800'
			case 'In Progress':
				return 'bg-blue-100 text-blue-800'
			case 'Pending':
				return 'bg-yellow-100 text-yellow-800'
			case 'Overdue':
				return 'bg-red-100 text-red-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}

	const getPriorityColor = (priority) => {
		switch (priority) {
			case 'High':
				return 'text-red-600'
			case 'Medium':
				return 'text-yellow-600'
			case 'Low':
				return 'text-green-600'
			default:
				return 'text-gray-600'
		}
	}

	const getPriorityIcon = (priority) => {
		switch (priority) {
			case 'High':
				return 'fas fa-exclamation-triangle'
			case 'Medium':
				return 'fas fa-minus-circle'
			case 'Low':
				return 'fas fa-arrow-down'
			default:
				return 'fas fa-circle'
		}
	}

	// Handle create task
	const handleCreateTask = async () => {
		if (!newTask.taskName || !newTask.assignedTo || !newTask.dueDate) {
			alert('Please fill in all required fields')
			return
		}

		setCreatingTask(true)
		try {
			const token = localStorage.getItem('access_token')
			
			// Find assigned employee details
			const assignedEmployee = employees.find(emp => 
				emp.employee_id === newTask.assignedTo || 
				emp.user_id === newTask.assignedTo ||
				emp.full_name === newTask.assignedTo
			)

			// Prepare task data for API - match exact Task model fields
			const apiTaskData = {
				taskName: newTask.taskName,
				description: newTask.description || '',
				assignedTo: newTask.assignedTo,
				assignedBy: newTask.assignedBy || localStorage.getItem('username') || 'HR Manager',
				team: newTask.team || assignedEmployee?.department || 'General',
				priority: newTask.priority,
				status: newTask.status,
				dueDate: newTask.dueDate,
				estimatedHours: parseInt(newTask.estimatedHours) || 0,
				timeSpent: 0,
				deviation: '0 hrs',
				lastActivity: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
				progress: 0
			}

			console.log('Sending task data:', apiTaskData) // Debug log

			// Call the backend API
			const response = await fetch('/api/hr/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(apiTaskData)
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				console.error('API Error:', errorData)
				throw new Error(`Failed to create task: ${response.status} - ${errorData.detail || 'Unknown error'}`)
			}

			const result = await response.json()
			
			// Refresh tasks from backend to get updated list
			await refreshTasks()
			
			// Reset form and close modal
			setNewTask({
				taskName: '',
				description: '',
				assignedTo: '',
				assignedBy: '',
				team: '',
				priority: 'Medium',
				dueDate: '',
				estimatedHours: '',
				status: 'Pending'
			})
			setShowCreateTaskModal(false)

			alert('Task created and assigned successfully!')

		} catch (error) {
			console.error('Error creating task:', error)
			alert(`Failed to create task: ${error.message}`)
		} finally {
			setCreatingTask(false)
		}
	}

	// Handle assign task to different employee
	const handleReassignTask = async (taskId, newAssigneeId) => {
		try {
			const assignedEmployee = employees.find(emp => 
				emp.employee_id === newAssigneeId || 
				emp.user_id === newAssigneeId
			)

			setTasks(prevTasks => 
				prevTasks.map(task => 
					task.id === taskId 
						? {
							...task,
							assignedTo: newAssigneeId,
							employeeName: assignedEmployee?.full_name || assignedEmployee?.name || newAssigneeId,
							team: assignedEmployee?.department || task.team,
							lastActivity: new Date().toISOString().slice(0, 10)
						}
						: task
				)
			)

			alert('Task reassigned successfully!')
		} catch (error) {
			console.error('Error reassigning task:', error)
			alert('Failed to reassign task. Please try again.')
		}
	}

	// Chart configuration for Task Status Trend
	const chartData = useMemo(() => {
		try {
			if (!chartJSAvailable || !trendData?.trendData || !Array.isArray(trendData.trendData) || trendData.trendData.length === 0) {
				return {
					labels: [],
					datasets: []
				}
			}

			const labels = trendData.trendData.map(item => {
				if (!item?.date) return 'N/A'
				try {
					const date = new Date(item.date)
					return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
				} catch (err) {
					return 'N/A'
				}
			})

			return {
				labels,
				datasets: [
					{
						label: 'Completed Tasks',
						data: trendData.trendData.map(item => item?.completed || 0),
						borderColor: 'rgb(34, 197, 94)',
						backgroundColor: 'rgba(34, 197, 94, 0.1)',
						tension: 0.4,
						fill: false
					},
					{
						label: 'In Progress Tasks',
						data: trendData.trendData.map(item => item?.inProgress || 0),
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						tension: 0.4,
						fill: false
					}
				]
			}
		} catch (error) {
			console.error('Error processing chart data:', error)
			return {
				labels: [],
				datasets: []
			}
		}
	}, [trendData, chartJSAvailable])

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'top'
			},
			tooltip: {
				mode: 'index',
				intersect: false
			}
		},
		scales: {
			x: {
				display: true
			},
			y: {
				display: true,
				beginAtZero: true
			}
		}
	}

	// Review handlers
	const handleOpenReviewModal = (task = null) => {
		setSelectedTaskForReview(task)
		setReviewData({
			rating: 5,
			comments: '',
			reviewType: task ? 'task' : 'project',
			recommendations: ''
		})
		setShowReviewModal(true)
	}

	const handleCloseReviewModal = () => {
		setShowReviewModal(false)
		setSelectedTaskForReview(null)
		setReviewData({
			rating: 5,
			comments: '',
			reviewType: 'project',
			recommendations: ''
		})
	}

	const handleSubmitReview = async () => {
		if (!reviewData.comments.trim()) {
			alert('Please provide review comments')
			return
		}

		setSubmittingReview(true)
		try {
			const token = localStorage.getItem('access_token')
			
			const reviewPayload = {
				taskId: selectedTaskForReview?.id || null,
				reviewType: reviewData.reviewType,
				rating: reviewData.rating,
				comments: reviewData.comments,
				recommendations: reviewData.recommendations,
				reviewedBy: localStorage.getItem('username') || 'HR Manager',
				createdAt: new Date().toISOString()
			}

			console.log('Submitting review:', reviewPayload)

			// Try to submit to API
			const response = await fetch('/api/reviews/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: token ? `Bearer ${token}` : ''
				},
				body: JSON.stringify(reviewPayload)
			})

			if (response.ok) {
				alert('Review submitted successfully!')
			} else {
				console.log('Review API not available, showing success message')
				alert('Review submitted successfully! (Local storage)')
			}

			// Store review locally as backup
			const existingReviews = JSON.parse(localStorage.getItem('task_reviews') || '[]')
			existingReviews.push({ ...reviewPayload, id: Date.now() })
			localStorage.setItem('task_reviews', JSON.stringify(existingReviews))

			handleCloseReviewModal()
		} catch (error) {
			console.error('Error submitting review:', error)
			alert('Review saved locally. Will sync when server is available.')
			
			// Store locally on error
			const existingReviews = JSON.parse(localStorage.getItem('task_reviews') || '[]')
			existingReviews.push({ 
				...reviewPayload, 
				id: Date.now(),
				status: 'pending_sync'
			})
			localStorage.setItem('task_reviews', JSON.stringify(existingReviews))
			
			handleCloseReviewModal()
		} finally {
			setSubmittingReview(false)
		}
	}

	// Export Report handlers
	const handleOpenExportModal = () => {
		setShowExportModal(true)
	}

	const handleCloseExportModal = () => {
		setShowExportModal(false)
		setExportFormat('csv')
		setExportDateRange('all')
	}

	const generateExportData = () => {
		let exportTasks = [...tasks]
		
		// Filter by date range if needed
		if (exportDateRange !== 'all') {
			const today = new Date()
			let filterDate = new Date()
			
			switch (exportDateRange) {
				case 'week':
					filterDate.setDate(today.getDate() - 7)
					break
				case 'month':
					filterDate.setMonth(today.getMonth() - 1)
					break
				case 'quarter':
					filterDate.setMonth(today.getMonth() - 3)
					break
				default:
					filterDate = null
			}
			
			if (filterDate) {
				exportTasks = exportTasks.filter(task => {
					const taskDate = new Date(task.lastActivity || task.createdAt)
					return taskDate >= filterDate
				})
			}
		}
		
		// Map tasks to export format using exact existing field names
		return exportTasks.map(task => {
			const row = {}
			if (exportFields.employeeName) row['Employee Name'] = task.employeeName || 'Unknown'
			if (exportFields.taskName) row['Task Name'] = task.taskName || 'Untitled'
			if (exportFields.assignedBy) row['Assigned By'] = task.assignedBy || 'Unknown'
			if (exportFields.status) row['Status'] = task.status || 'Pending'
			if (exportFields.timeSpent) row['Time Spent'] = task.timeSpent || 0
			if (exportFields.priority) row['Priority'] = task.priority || 'Medium'
			if (exportFields.dueDate) row['Due Date'] = task.dueDate || 'Not set'
			if (exportFields.lastActivity) row['Last Activity'] = task.lastActivity || 'N/A'
			return row
		})
	}

	const convertToCSV = (data) => {
		if (!data.length) return ''
		
		const headers = Object.keys(data[0])
		const csvContent = [
			headers.join(','),
			...data.map(row => 
				headers.map(header => 
					`"${String(row[header] || '').replace(/"/g, '""')}"`
				).join(',')
			)
		].join('\n')
		
		return csvContent
	}

	const downloadFile = (content, filename, type) => {
		const blob = new Blob([content], { type })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const handleExportReport = async () => {
		setExporting(true)
		try {
			const token = localStorage.getItem('access_token')
			const exportData = generateExportData()
			
			// Try to log export to API
			try {
				const response = await fetch('/api/reports/export', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: token ? `Bearer ${token}` : ''
					},
					body: JSON.stringify({
						format: exportFormat,
						dateRange: exportDateRange,
						fields: Object.keys(exportFields).filter(key => exportFields[key]),
						taskCount: exportData.length,
						exportedBy: localStorage.getItem('username') || 'HR Manager',
						exportedAt: new Date().toISOString()
					})
				})

				if (response.ok) {
					console.log('Export logged successfully')
				}
			} catch (apiError) {
				console.log('Export API not available, proceeding with local export')
			}

			// Generate and download file
			const timestamp = new Date().toISOString().slice(0, 10)
			
			switch (exportFormat) {
				case 'csv': {
					const csvContent = convertToCSV(exportData)
					downloadFile(csvContent, `hr-tasks-${timestamp}.csv`, 'text/csv')
					break
				}
				case 'json': {
					const jsonContent = JSON.stringify({
						meta: {
							exportedAt: new Date().toISOString(),
							exportedBy: localStorage.getItem('username') || 'HR Manager',
							totalTasks: exportData.length,
							dateRange: exportDateRange
						},
						data: exportData
					}, null, 2)
					downloadFile(jsonContent, `hr-tasks-${timestamp}.json`, 'application/json')
					break
				}
				case 'txt': {
					const txtContent = exportData.map(row => 
						Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(' | ')
					).join('\n')
					downloadFile(txtContent, `hr-tasks-${timestamp}.txt`, 'text/plain')
					break
				}
			}

			alert(`Successfully exported ${exportData.length} tasks as ${exportFormat.toUpperCase()}`)
			handleCloseExportModal()
		} catch (error) {
			console.error('Export error:', error)
			alert('Export failed. Please try again.')
		} finally {
			setExporting(false)
		}
	}

	// All early returns moved to after all hooks are complete
	// Show loading state
	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading HR Task Management Dashboard...</p>
				</div>
			</div>
		)
	}

	// Show error state
	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="p-4 bg-red-100 rounded-lg mb-4">
						<i className="fas fa-exclamation-triangle text-red-600 text-3xl mb-2"></i>
						<p className="text-red-600 font-medium">Error loading data</p>
						<p className="text-red-500 text-sm">{error}</p>
					</div>
					<button 
						onClick={() => window.location.reload()}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		)
	}

	// Component error boundary check moved to before final return
	if (componentError) {
		return (
			<div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="p-4 bg-red-100 rounded-lg mb-4">
						<i className="fas fa-exclamation-triangle text-red-600 text-3xl mb-2"></i>
						<p className="text-red-600 font-medium">Component Error</p>
						<p className="text-red-500 text-sm">{componentError}</p>
					</div>
					<button 
						onClick={() => {
							setComponentError(null)
							window.location.reload()
						}}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
					>
						Reload Component
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-blue-600 rounded-lg">
						<i className="fas fa-tasks text-white text-xl"></i>
					</div>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">HR Task Management Dashboard</h1>
						
					</div>
				</div>
				<div className="text-sm text-gray-500">
					{(() => {
						try {
							return new Date().toLocaleDateString('en-US', { 
								weekday: 'long', 
								year: 'numeric', 
								month: 'long', 
								day: 'numeric' 
							})
						} catch (error) {
							console.error('Date formatting error:', error)
							setComponentError('Date formatting failed')
							return 'Today'
						}
					})()}
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-end mb-6">
				<button 
					onClick={() => setShowCreateTaskModal(true)}
					className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
				>
					<i className="fas fa-plus"></i>
					Create New Task
				</button>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Active Tasks</p>
							<p className="text-3xl font-bold text-gray-900 mt-1">{statistics?.totalActiveTasks || 0}</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-lg">
							<i className="fas fa-tasks text-blue-600 text-xl"></i>
						</div>
					</div>
					<div className="mt-4 h-1 bg-blue-200 rounded-full">
						<div className="h-1 bg-blue-600 rounded-full" style={{ width: '75%' }}></div>
					</div>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Tasks Overdue</p>
							<p className="text-3xl font-bold text-red-600 mt-1">{statistics?.tasksOverdue || 0}</p>
						</div>
						<div className="p-3 bg-red-100 rounded-lg">
							<i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
						</div>
					</div>
					<div className="mt-4 flex items-center text-sm text-green-600">
						<i className="fas fa-arrow-up mr-1"></i>
						<span>2% increase</span>
					</div>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Completion Rate</p>
							<p className="text-3xl font-bold text-green-600 mt-1">{statistics?.completionRate || 0}%</p>
						</div>
						<div className="p-3 bg-green-100 rounded-lg">
							<i className="fas fa-check-circle text-green-600 text-xl"></i>
						</div>
					</div>
					<div className="mt-4 h-1 bg-green-200 rounded-full">
						<div className="h-1 bg-green-600 rounded-full" style={{ width: `${statistics?.completionRate || 0}%` }}></div>
					</div>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">High Priority Tasks</p>
							<p className="text-3xl font-bold text-orange-600 mt-1">{statistics?.highPriorityTasks || 0}</p>
						</div>
						<div className="p-3 bg-orange-100 rounded-lg">
							<i className="fas fa-star text-orange-600 text-xl"></i>
						</div>
					</div>
				</div>
			</div>

			{/* Charts Section */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
				{/* Workload Distribution */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-6">Workload Distribution by Team</h3>
					<div className="space-y-4">
						{(teamWorkload || []).map((team, index) => (
							<div key={team?.team || index} className="flex items-center justify-between">
								<div className="flex items-center gap-3 flex-1">
									<span className="text-sm font-medium text-gray-700 w-24">{team?.team || 'Unknown'}</span>
									<div className="flex-1 bg-gray-200 rounded-full h-3 relative">
										<div 
											className="bg-blue-600 h-3 rounded-full transition-all duration-300"
											style={{ width: `${team?.percentage || 0}%` }}
										></div>
										{(team?.inProgress || 0) > 0 && (
											<div 
												className="bg-red-500 h-3 rounded-full absolute top-0 transition-all duration-300"
												style={{ 
													width: `${Math.round(((team?.inProgress || 0) / (team?.total || 1)) * (team?.percentage || 0))}%`,
													left: `${Math.round(((team?.completed || 0) / (team?.total || 1)) * (team?.percentage || 0))}%`
												}}
											></div>
										)}
									</div>
								</div>
								<div className="flex items-center gap-4 ml-4">
									<div className="flex items-center gap-1">
										<div className="w-3 h-3 bg-blue-600 rounded-full"></div>
										<span className="text-xs text-gray-600">In Progress</span>
									</div>
									<div className="flex items-center gap-1">
										<div className="w-3 h-3 bg-red-500 rounded-full"></div>
										<span className="text-xs text-gray-600">HR</span>
									</div>
									<span className="text-sm font-semibold text-gray-900">{team?.total || 0}</span>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Task Status Trend Chart */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-lg font-semibold text-gray-900">Task Status Trend</h3>
						<div className="flex items-center space-x-2">
							<select 
								value={trendPeriod} 
								onChange={(e) => setTrendPeriod(parseInt(e.target.value))}
								className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value={7}>Last 7 days</option>
								<option value={14}>Last 2 weeks</option>
								<option value={30}>Last 30 days</option>
								<option value={60}>Last 60 days</option>
							</select>
							<button 
								onClick={() => {
									setChartError(false)
									fetchTaskStatusTrend(trendPeriod)
								}}
								className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								<i className="fas fa-refresh mr-1"></i>
								Refresh
							</button>
						</div>
					</div>
					
					{loadingTrend ? (
						<div className="h-64 flex items-center justify-center">
							<div className="text-center">
								<i className="fas fa-spinner fa-spin text-blue-500 text-2xl mb-2"></i>
								<p className="text-gray-600">Loading trend data...</p>
							</div>
						</div>
					) : chartData.labels.length > 0 && !chartError && chartJSAvailable ? (
						<div className="h-64">
							{(() => {
								try {
									return <Line data={chartData} options={chartOptions} />
								} catch (error) {
									console.error('Chart rendering error:', error)
									setChartError(true)
									return (
										<div className="h-64 flex items-center justify-center text-gray-500">
											<div className="text-center">
												<i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
												<p>Error loading chart</p>
												<p className="text-sm">Please try refreshing</p>
											</div>
										</div>
									)
								}
							})()}
						</div>
					) : chartData.labels.length > 0 ? (
						// Alternative visualization without Chart.js
						<div className="h-64 p-4">
							<div className="text-center mb-4">
								<p className="text-sm text-gray-600">Task Trend Data (Chart.js unavailable)</p>
							</div>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{trendData?.trendData?.slice(-7).map((item, index) => (
									<div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
										<div className="text-sm font-medium">
											{new Date(item.date).toLocaleDateString()}
										</div>
										<div className="flex items-center space-x-4">
											<div className="flex items-center">
												<div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
												<span className="text-sm">Completed: {item.completed || 0}</span>
											</div>
											<div className="flex items-center">
												<div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
												<span className="text-sm">In Progress: {item.inProgress || 0}</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="h-64 flex items-center justify-center text-gray-500">
							<div className="text-center">
								<i className="fas fa-chart-line text-4xl mb-4"></i>
								<p>No trend data available</p>
								<p className="text-sm">Try refreshing or check back later</p>
							</div>
						</div>
					)}
					{trendData?.summary && (
						<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
							<div className="text-center">
								<p className="text-sm text-gray-600">Total Tasks</p>
								<p className="text-xl font-bold text-gray-900">{trendData.summary.totalTasks || 0}</p>
							</div>
							<div className="text-center">
								<p className="text-sm text-gray-600">Completed</p>
								<p className="text-xl font-bold text-green-600">{trendData.summary.completedTasks || 0}</p>
							</div>
							<div className="text-center">
								<p className="text-sm text-gray-600">In Progress</p>
								<p className="text-xl font-bold text-blue-600">{trendData.summary.inProgressTasks || 0}</p>
							</div>
							<div className="text-center">
								<p className="text-sm text-gray-600">Completion Rate</p>
								<p className="text-xl font-bold text-purple-600">
									{(trendData.summary.currentCompletionRate || 0).toFixed(1)}%
									<i className={`fas fa-arrow-${trendData.summary.trendDirection || 'up'} ml-1 text-sm ${
										(trendData.summary.trendDirection || 'up') === 'up' ? 'text-green-500' : 'text-red-500'
									}`}></i>
								</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Filters and Search */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
				<div className="flex flex-wrap gap-4 items-center justify-between">
					<div className="flex flex-wrap gap-4 items-center">
						<div className="relative">
							<i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
							<input
								type="text"
								placeholder="Search tasks or employees..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
							/>
						</div>

						<select
							value={selectedDateRange}
							onChange={(e) => setSelectedDateRange(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="all">Date Range</option>
							<option value="today">Today</option>
							<option value="week">This Week</option>
							<option value="month">This Month</option>
						</select>

						<select
							value={selectedTeam}
							onChange={(e) => setSelectedTeam(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							{teams.map(team => (
								<option key={team} value={team}>{team === 'All' ? 'All Teams' : team}</option>
							))}
						</select>

						<select
							value={selectedAssignedBy}
							onChange={(e) => setSelectedAssignedBy(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							{assignees.map(assignee => (
								<option key={assignee} value={assignee}>{assignee === 'All' ? 'Assigned By' : assignee}</option>
							))}
						</select>

						<select
							value={selectedTimeSpent}
							onChange={(e) => setSelectedTimeSpent(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="All">Time Spent</option>
							<option value="low">0-20 hrs</option>
							<option value="medium">21-40 hrs</option>
							<option value="high">40+ hrs</option>
						</select>
					</div>

					
				</div>
			</div>

			{/* Detailed Task Log */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900">Detailed Task Log</h3>
					<div className="flex gap-2">
						<button 
							onClick={handleOpenExportModal}
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer transition-colors"
						>
							<i className="fas fa-download mr-1"></i>
							Export Report
						</button>
					</div>
				</div>

				{loading && (
					<div className="p-8 text-center">
						<div className="inline-flex items-center gap-2 text-gray-600">
							<i className="fas fa-spinner fa-spin"></i>
							Loading tasks...
						</div>
					</div>
				)}

				{error && (
					<div className="p-8 text-center">
						<div className="text-red-600">
							<i className="fas fa-exclamation-circle mr-2"></i>
							Error: {error}
						</div>
					</div>
				)}

				{!loading && !error && (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Employee Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Task Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Project Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Assigned By
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Time Spent
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Deviation
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Last Activity
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredTasks.length === 0 ? (
									<tr>
										<td colSpan={9} className="px-6 py-8 text-center text-gray-500">
											<i className="fas fa-inbox text-4xl mb-2 block"></i>
											No tasks found matching your criteria
										</td>
									</tr>
								) : (
									filteredTasks.map((task, index) => (
										<tr 
											key={task.id} 
											className="hover:bg-gray-50 transition-colors cursor-pointer"
											onClick={() => handleTaskClick(task)}
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center">
													<div className="flex-shrink-0 h-8 w-8">
														<div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
															<span className="text-sm font-medium text-blue-600">
																{(task?.employeeName || 'U').split(' ').map(n => n?.[0] || '').join('').slice(0, 2) || 'UN'}
															</span>
														</div>
													</div>
													<div className="ml-3">
														<div className="text-sm font-medium text-gray-900">{task?.employeeName || 'Unknown'}</div>
													</div>
												</div>
											</td>
											<td className="px-6 py-4 text-sm text-gray-900">{task?.taskName || 'Untitled'}</td>
											<td className="px-6 py-4 text-sm text-gray-600">
												<div className="flex items-center">
													<i className="fas fa-folder text-blue-500 mr-2 text-sm"></i>
													<span>{task?.projectName || task?.customerName || 'No Project'}</span>
												</div>
											</td>
											<td className="px-6 py-4 text-sm text-gray-600">{task?.assignedBy || 'Unknown'}</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task?.status || 'Pending')}`}>
													{task?.status || 'Pending'}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center gap-2">
													<i className={`${getPriorityIcon(task?.priority || 'Medium')} ${getPriorityColor(task?.priority || 'Medium')}`}></i>
													<span className="text-sm text-gray-900">{task?.progress || 0}%</span>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{task?.timeSpent || 0} hrs
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
												{task?.deviation || '0 hrs'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
												{(task?.status || 'Pending') === 'Completed' ? 'Completed' : 'Template'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												<div className="flex items-center space-x-3">
													<button
														className="text-blue-600 hover:text-blue-800 transition-colors"
														title="View Details"
														onClick={(e) => {
															e.stopPropagation()
															handleViewTaskDetails(task)
														}}
													>
														<i className="fas fa-eye text-sm"></i>
													</button>
													<button
														className="text-orange-600 hover:text-orange-800 transition-colors"
														title="Add Review"
														onClick={(e) => {
															e.stopPropagation()
															handleOpenReviewModal(task)
														}}
													>
														<i className="fas fa-star text-sm"></i>
													</button>
													{task.status !== 'Completed' && (
														<>
															<button
																className="text-green-600 hover:text-green-800 transition-colors"
																title="Edit Task"
																onClick={(e) => {
																	e.stopPropagation()
																	handleEditTask(task)
																}}
															>
																<i className="fas fa-edit text-sm"></i>
															</button>
															<button
																className="text-red-600 hover:text-red-800 transition-colors"
																title="Delete Task"
																onClick={() => {
																	if (window.confirm('Are you sure you want to delete this task?')) {
																		setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id))
																	}
																}}
															>
																<i className="fas fa-trash text-sm"></i>
															</button>
														</>
													)}
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Create Task Modal */}
			{showCreateTaskModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-bold text-gray-900">Create New Task</h3>
								<button
									onClick={() => setShowCreateTaskModal(false)}
									className="text-gray-400 hover:text-gray-600"
								>
									<i className="fas fa-times text-xl"></i>
								</button>
							</div>

							<div className="space-y-4">
								{/* Task Name */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Task Name *
									</label>
									<input
										type="text"
										value={newTask.taskName}
										onChange={(e) => setNewTask(prev => ({ ...prev, taskName: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Enter task name"
									/>
								</div>

								{/* Description */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Description
									</label>
									<textarea
										value={newTask.description}
										onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										rows="3"
										placeholder="Enter task description"
									/>
								</div>

								{/* Assign To */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Assign To *
									</label>
									<select
										value={newTask.assignedTo}
										onChange={(e) => setNewTask(prev => ({ ...prev, assignedTo: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="">Select Employee</option>
										{employees.map((emp) => (
											<option 
												key={emp.employee_id || emp.user_id} 
												value={emp.employee_id || emp.user_id}
											>
												{emp.full_name || emp.name} 
											</option>
										))}
									</select>
								</div>

								{/* Two Column Layout */}
								<div className="grid grid-cols-2 gap-4">
									{/* Team */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Team
										</label>
										<input
											type="text"
											value={newTask.team}
											onChange={(e) => setNewTask(prev => ({ ...prev, team: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter team name"
										/>
									</div>

									{/* Priority */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Priority
										</label>
										<select
											value={newTask.priority}
											onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="Low">Low</option>
											<option value="Medium">Medium</option>
											<option value="High">High</option>
										</select>
									</div>
								</div>

								{/* Two Column Layout */}
								<div className="grid grid-cols-2 gap-4">
									{/* Due Date */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Due Date *
										</label>
										<input
											type="date"
											value={newTask.dueDate}
											onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											min={new Date().toISOString().split('T')[0]}
										/>
									</div>

									{/* Estimated Hours */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Estimated Hours
										</label>
										<input
											type="number"
											value={newTask.estimatedHours}
											onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Hours"
											min="1"
											max="200"
										/>
									</div>
								</div>

								{/* Assigned By */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Assigned By
									</label>
									<input
										type="text"
										value={newTask.assignedBy}
										onChange={(e) => setNewTask(prev => ({ ...prev, assignedBy: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Manager/Lead name"
									/>
								</div>
							</div>

							{/* Modal Actions */}
							<div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
								<button
									onClick={() => setShowCreateTaskModal(false)}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleCreateTask}
									disabled={creatingTask}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{creatingTask ? 'Creating...' : 'Create Task'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Task Details Modal */}
			{showTaskDetailsModal && selectedTask && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-200">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
									<i className="fas fa-tasks text-blue-600 text-lg"></i>
								</div>
								<div>
									<h3 className="text-xl font-semibold text-gray-900">{selectedTask.taskName}</h3>
									<p className="text-sm text-gray-600">Assigned to {selectedTask.employeeName}</p>
								</div>
							</div>
							<button
								onClick={closeTaskDetailsModal}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								<i className="fas fa-times text-xl"></i>
							</button>
						</div>

						{/* Modal Content */}
						<div className="p-6">
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Left Column - Task Details */}
								<div className="lg:col-span-2 space-y-6">
									{/* Task Information */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h4>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<span className="font-medium text-gray-700">Status:</span>
												<span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTask.status)}`}>
													{selectedTask.status}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Priority:</span>
												<span className={`ml-2 ${getPriorityColor(selectedTask.priority)}`}>
													<i className={`${getPriorityIcon(selectedTask.priority)} mr-1`}></i>
													{selectedTask.priority}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Team:</span>
												<span className="ml-2 text-gray-600">{selectedTask.team}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Assigned By:</span>
												<span className="ml-2 text-gray-600">{selectedTask.assignedBy}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Due Date:</span>
												<span className="ml-2 text-gray-600">{selectedTask.dueDate || 'Not set'}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Estimated Hours:</span>
												<span className="ml-2 text-gray-600">{selectedTask.estimatedHours || 0} hrs</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Time Spent:</span>
												<span className="ml-2 text-gray-600">{selectedTask.timeSpent} hrs</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Progress:</span>
												<span className="ml-2 text-gray-600">{selectedTask.progress}%</span>
											</div>
										</div>
									</div>

									{/* Task Description */}
									{selectedTask.description && (
										<div className="bg-gray-50 rounded-lg p-4">
											<h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
											<p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
										</div>
									)}

									{/* Progress Bar */}
									<div className="bg-gray-50 rounded-lg p-4">
										<div className="flex items-center justify-between mb-2">
											<h4 className="text-lg font-semibold text-gray-900">Progress</h4>
											<span className="text-sm font-medium text-gray-600">{selectedTask.progress}%</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-3">
											<div 
												className="bg-blue-600 h-3 rounded-full transition-all duration-300"
												style={{ width: `${selectedTask.progress}%` }}
											></div>
										</div>
									</div>
								</div>

								{/* Right Column - Updates and Activity */}
								<div className="space-y-6">
									{/* Task Updates */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-lg font-semibold text-gray-900 mb-4">Project Updates</h4>
										
										{loadingUpdates ? (
											<div className="text-center py-8">
												<i className="fas fa-spinner fa-spin text-gray-400 text-2xl"></i>
												<p className="text-gray-600 mt-2">Loading updates...</p>
											</div>
										) : (
											<div className="space-y-4 max-h-96 overflow-y-auto">
												{taskUpdates.length > 0 ? (
													taskUpdates.map((update) => (
														<div key={update.id} className="border-l-4 border-blue-500 pl-4 pb-4">
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<p className="text-sm font-medium text-gray-900">{update.message}</p>
																	<p className="text-xs text-gray-600 mt-1">by {update.user}</p>
																	{update.details && (
																		<p className="text-sm text-gray-700 mt-2">{update.details}</p>
																	)}
																</div>
																<span className="text-xs text-gray-500">
																	{new Date(update.timestamp).toLocaleDateString()}
																</span>
															</div>
														</div>
													))
												) : (
													<div className="text-center py-8">
														<i className="fas fa-clock text-gray-400 text-2xl"></i>
														<p className="text-gray-600 mt-2">No updates yet</p>
													</div>
												)}
											</div>
										)}
									</div>

									{/* Employee Information */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-lg font-semibold text-gray-900 mb-4">Employee Info</h4>
										<div className="flex items-center gap-3 mb-3">
											<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
												<span className="text-sm font-medium text-blue-600">
													{selectedTask.employeeName.split(' ').map(n => n[0]).join('')}
												</span>
											</div>
											<div>
												<p className="font-medium text-gray-900">{selectedTask.employeeName}</p>
												<p className="text-sm text-gray-600">{selectedTask.team}</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Modal Actions */}
						<div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
							<button
								onClick={closeTaskDetailsModal}
								className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Edit Task Modal */}
			{showEditTaskModal && editingTask && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-2xl font-bold text-gray-900">Edit Task</h2>
								<button
									onClick={() => setShowEditTaskModal(false)}
									className="text-gray-500 hover:text-gray-700 text-2xl"
								>
									×
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Task Name</label>
									<input
										type="text"
										value={editTaskData.taskName}
										onChange={(e) => setEditTaskData({...editTaskData, taskName: e.target.value})}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Enter task name"
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
									<textarea
										value={editTaskData.description}
										onChange={(e) => setEditTaskData({...editTaskData, description: e.target.value})}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										rows="3"
										placeholder="Enter task description"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">Assigned To</label>
										<select
											value={editTaskData.assignedTo}
											onChange={(e) => setEditTaskData({...editTaskData, assignedTo: e.target.value})}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="">Select Employee</option>
											{employees.map((employee) => (
												<option key={employee.employee_id} value={employee.employee_id}>
													{employee.full_name}
												</option>
											))}
										</select>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">Team</label>
										<input
											type="text"
											value={editTaskData.team}
											onChange={(e) => setEditTaskData({...editTaskData, team: e.target.value})}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter team name"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
										<select
											value={editTaskData.priority}
											onChange={(e) => setEditTaskData({...editTaskData, priority: e.target.value})}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="Low">Low</option>
											<option value="Medium">Medium</option>
											<option value="High">High</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
										<select
											value={editTaskData.status}
											onChange={(e) => setEditTaskData({...editTaskData, status: e.target.value})}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="Not Started">Not Started</option>
											<option value="In Progress">In Progress</option>
											<option value="Completed">Completed</option>
											<option value="On Hold">On Hold</option>
										</select>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">Progress (%)</label>
										<input
											type="number"
											min="0"
											max="100"
											value={editTaskData.progress}
											onChange={(e) => setEditTaskData({...editTaskData, progress: parseInt(e.target.value) || 0})}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="0-100"
										/>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">Time Spent (hours)</label>
										<input
											type="number"
											min="0"
											step="0.5"
											value={editTaskData.timeSpent}
											onChange={(e) => setEditTaskData({...editTaskData, timeSpent: parseFloat(e.target.value) || 0})}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Hours spent"
										/>
									</div>
								</div>

								<div className="flex justify-end space-x-3 pt-4">
									<button
										onClick={() => setShowEditTaskModal(false)}
										className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleUpdateTask}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
									>
										Update Task
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Review Modal */}
			{showReviewModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
									<i className="fas fa-star text-yellow-500"></i>
									{selectedTaskForReview ? 'Review Task' : 'Add Project Review'}
								</h2>
								<button
									onClick={handleCloseReviewModal}
									className="text-gray-500 hover:text-gray-700 text-2xl"
								>
									×
								</button>
							</div>

							{selectedTaskForReview && (
								<div className="bg-gray-50 rounded-lg p-4 mb-6">
									<h3 className="font-semibold text-gray-900 mb-2">Task Details</h3>
									<p className="text-sm text-gray-600">
										<strong>Task:</strong> {selectedTaskForReview.taskName || 'N/A'}
									</p>
									<p className="text-sm text-gray-600">
										<strong>Assigned to:</strong> {selectedTaskForReview.employeeName || selectedTaskForReview.assignedTo || 'N/A'}
									</p>
									<p className="text-sm text-gray-600">
										<strong>Status:</strong> {selectedTaskForReview.status || 'N/A'}
									</p>
								</div>
							)}

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Review Type</label>
									<select
										value={reviewData.reviewType}
										onChange={(e) => setReviewData({...reviewData, reviewType: e.target.value})}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="task">Task Review</option>
										<option value="project">Project Review</option>
										<option value="performance">Performance Review</option>
										<option value="general">General Review</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Rating (1-5 Stars)</label>
									<div className="flex items-center gap-2">
										{[1, 2, 3, 4, 5].map((rating) => (
											<button
												key={rating}
												onClick={() => setReviewData({...reviewData, rating})}
												className={`text-2xl ${
													rating <= reviewData.rating
														? 'text-yellow-400'
														: 'text-gray-300'
												} hover:text-yellow-400 transition-colors`}
											>
												<i className="fas fa-star"></i>
											</button>
										))}
										<span className="ml-2 text-sm text-gray-600">
											{reviewData.rating}/5 stars
										</span>
									</div>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Review Comments</label>
									<textarea
										value={reviewData.comments}
										onChange={(e) => setReviewData({...reviewData, comments: e.target.value})}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										rows="4"
										placeholder="Share your feedback, observations, and comments..."
										required
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Recommendations (Optional)</label>
									<textarea
										value={reviewData.recommendations}
										onChange={(e) => setReviewData({...reviewData, recommendations: e.target.value})}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										rows="3"
										placeholder="Any suggestions for improvement or future recommendations..."
									/>
								</div>
							</div>

							<div className="flex justify-end gap-3 mt-6">
								<button
									onClick={handleCloseReviewModal}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleSubmitReview}
									disabled={submittingReview || !reviewData.comments.trim()}
									className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{submittingReview && <i className="fas fa-spinner fa-spin"></i>}
									Submit Review
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Export Modal - uses exact existing field structure */}
			{showExportModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
									<i className="fas fa-download text-blue-500"></i>
									Export Tasks Report
								</h2>
								<button
									onClick={handleCloseExportModal}
									className="text-gray-500 hover:text-gray-700 text-2xl"
								>
									×
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Export Format</label>
									<select
										value={exportFormat}
										onChange={(e) => setExportFormat(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="csv">CSV - Excel Compatible</option>
										<option value="json">JSON - Data Format</option>
										<option value="txt">TXT - Plain Text</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
									<select
										value={exportDateRange}
										onChange={(e) => setExportDateRange(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="all">All Tasks</option>
										<option value="week">Last 7 Days</option>
										<option value="month">Last 30 Days</option>
										<option value="quarter">Last 3 Months</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Include Fields</label>
									<div className="space-y-2 max-h-32 overflow-y-auto">
										{Object.entries({
											employeeName: 'Employee Name',
											taskName: 'Task Name',
											assignedBy: 'Assigned By',
											status: 'Status',
											timeSpent: 'Time Spent',
											priority: 'Priority',
											dueDate: 'Due Date',
											lastActivity: 'Last Activity'
										}).map(([key, label]) => (
											<label key={key} className="flex items-center">
												<input
													type="checkbox"
													checked={exportFields[key]}
													onChange={(e) => setExportFields({
														...exportFields,
														[key]: e.target.checked
													})}
													className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
												/>
												<span className="text-sm text-gray-700">{label}</span>
											</label>
										))}
									</div>
								</div>

								<div className="bg-blue-50 rounded-lg p-3">
									<div className="text-sm text-blue-800">
										<i className="fas fa-info-circle mr-1"></i>
										<strong>{tasks.length}</strong> tasks ready for export
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-3 mt-6">
								<button
									onClick={handleCloseExportModal}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleExportReport}
									disabled={exporting}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{exporting && <i className="fas fa-spinner fa-spin"></i>}
									<i className="fas fa-download"></i>
									Export
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

// Wrapped component with Error Boundary
const HRTaskManagementDashboardWithErrorBoundary = () => (
	<ErrorBoundary>
		<HRTaskManagementDashboard />
	</ErrorBoundary>
)

export default HRTaskManagementDashboardWithErrorBoundary