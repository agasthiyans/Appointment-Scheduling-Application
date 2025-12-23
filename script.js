const STORAGE_KEY = 'capminds_appointments';

// State
let appointments = [];
let currentDate = new Date(2023, 0, 18); // January 18, 2023 per design
let currentView = 'calendar';
let editingAppointmentId = null;

// DOM Elements
const bookAppointmentBtn = document.getElementById('bookAppointmentBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item');
const calendarView = document.getElementById('calendarView');
const dashboardView = document.getElementById('dashboardView');
const modalOverlay = document.getElementById('modalOverlay');
const appointmentForm = document.getElementById('appointmentForm');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');
const currentDateEl = document.getElementById('currentDate');
const daysGrid = document.getElementById('daysGrid');
const doctorNameEl = document.getElementById('doctorName');
const appointmentsTableBody = document.getElementById('appointmentsTableBody');
const patientSearchInput = document.getElementById('patientSearch');
const doctorSearchInput = document.getElementById('doctorSearch');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const updateBtn = document.getElementById('updateBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Months
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ========================================
// Utility Functions
// ========================================

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTableDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime12h(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ========================================
// Storage Functions
// ========================================

function loadAppointments() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      appointments = JSON.parse(stored);
    } catch {
      appointments = [];
    }
  }
}

function saveAppointments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

// ========================================
// View Management
// ========================================

function switchView(view) {
  currentView = view;
  
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  
  calendarView.classList.toggle('hidden', view !== 'calendar');
  dashboardView.classList.toggle('hidden', view !== 'dashboard');
  
  if (view === 'dashboard') {
    renderDashboard();
  }
}

// ========================================
// Calendar Functions
// ========================================

function renderCalendar() {
  // Update header
  currentDateEl.textContent = formatDisplayDate(currentDate);
  
  // Update doctor name
  const doctors = [...new Set(appointments.map(apt => apt.doctorName))];
  doctorNameEl.textContent = doctors[0] || 'James Marry';
  
  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days = [];
  const current = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month
    });
    current.setDate(current.getDate() + 1);
  }
  
  // Render days
  daysGrid.innerHTML = '';
  
  days.forEach(dayInfo => {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    
    const dateKey = formatDateKey(dayInfo.date);
    const todayKey = formatDateKey(new Date());
    const isFriday = dayInfo.date.getDay() === 5;
    
    if (!dayInfo.isCurrentMonth) {
      dayCell.classList.add('other-month');
    }
    if (dateKey === todayKey) {
      dayCell.classList.add('today');
    }
    if (isFriday) {
      dayCell.classList.add('friday');
    }
    
    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    const day = dayInfo.date.getDate();
    if (day === 1) {
      dayNumber.textContent = `${MONTHS[dayInfo.date.getMonth()].slice(0, 3)} ${day}`;
    } else {
      dayNumber.textContent = day;
    }
    dayCell.appendChild(dayNumber);
    
    // Appointments for this day
    const dayAppointments = appointments.filter(apt => apt.date === dateKey);
    
    if (dayAppointments.length > 0) {
      const appointmentsContainer = document.createElement('div');
      appointmentsContainer.className = 'day-appointments';
      
      dayAppointments.forEach(apt => {
        const card = createAppointmentCard(apt);
        appointmentsContainer.appendChild(card);
      });
      
      dayCell.appendChild(appointmentsContainer);
    }
    
    daysGrid.appendChild(dayCell);
  });
}

function createAppointmentCard(appointment) {
  const card = document.createElement('div');
  card.className = 'appointment-card';
  
  const info = document.createElement('div');
  info.className = 'appointment-info';
  info.textContent = `${appointment.patientName} (${appointment.doctorName}) ${formatTime12h(appointment.time)}`;
  card.appendChild(info);
  
  const actions = document.createElement('div');
  actions.className = 'appointment-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn edit';
  editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>`;
  editBtn.onclick = (e) => {
    e.stopPropagation();
    openEditModal(appointment);
  };
  actions.appendChild(editBtn);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn delete';
  deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>`;
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteAppointment(appointment.id);
  };
  actions.appendChild(deleteBtn);
  
  card.appendChild(actions);
  
  return card;
}

// ========================================
// Dashboard Functions
// ========================================

function renderDashboard() {
  const patientSearch = patientSearchInput.value.toLowerCase();
  const doctorSearch = doctorSearchInput.value.toLowerCase();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  let filtered = appointments.filter(apt => {
    const matchesPatient = !patientSearch || apt.patientName.toLowerCase().includes(patientSearch);
    const matchesDoctor = !doctorSearch || apt.doctorName.toLowerCase().includes(doctorSearch);
    
    let matchesDateRange = true;
    if (startDate && endDate) {
      matchesDateRange = apt.date >= startDate && apt.date <= endDate;
    } else if (startDate) {
      matchesDateRange = apt.date >= startDate;
    } else if (endDate) {
      matchesDateRange = apt.date <= endDate;
    }
    
    return matchesPatient && matchesDoctor && matchesDateRange;
  });
  
  appointmentsTableBody.innerHTML = '';
  
  if (filtered.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7" class="empty-state">No appointments found</td>`;
    appointmentsTableBody.appendChild(row);
    return;
  }
  
  filtered.forEach(apt => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="link">${apt.patientName}</td>
      <td class="link">${apt.doctorName}</td>
      <td>${apt.hospitalName}</td>
      <td>${apt.specialty}</td>
      <td>${formatTableDate(apt.date)}</td>
      <td class="time">${formatTime12h(apt.time)} - ${formatTime12h(apt.time)}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn edit" data-id="${apt.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="table-action-btn delete" data-id="${apt.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    
    // Add event listeners for actions
    row.querySelector('.table-action-btn.edit').onclick = () => {
      const appointment = appointments.find(a => a.id === apt.id);
      if (appointment) openEditModal(appointment);
    };
    
    row.querySelector('.table-action-btn.delete').onclick = () => {
      deleteAppointment(apt.id);
    };
    
    appointmentsTableBody.appendChild(row);
  });
}

// ========================================
// Modal Functions
// ========================================

function openModal() {
  editingAppointmentId = null;
  appointmentForm.reset();
  clearErrors();
  modalOverlay.classList.remove('hidden');
}

function openEditModal(appointment) {
  editingAppointmentId = appointment.id;
  
  document.getElementById('patientName').value = appointment.patientName;
  document.getElementById('doctorNameInput').value = appointment.doctorName;
  document.getElementById('hospitalName').value = appointment.hospitalName;
  document.getElementById('specialty').value = appointment.specialty;
  document.getElementById('appointmentDate').value = appointment.date;
  document.getElementById('appointmentTime').value = appointment.time;
  document.getElementById('reason').value = appointment.reason || '';
  
  clearErrors();
  modalOverlay.classList.remove('hidden');
}

function closeModalFn() {
  modalOverlay.classList.add('hidden');
  editingAppointmentId = null;
  appointmentForm.reset();
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  document.querySelectorAll('.input-with-icon select, .input-with-icon input').forEach(el => {
    el.classList.remove('error');
  });
}

function validateForm() {
  let isValid = true;
  clearErrors();
  
  const fields = [
    { id: 'patientName', errorId: 'patientNameError', message: 'Patient name is required' },
    { id: 'doctorNameInput', errorId: 'doctorNameError', message: 'Doctor name is required' },
    { id: 'hospitalName', errorId: 'hospitalNameError', message: 'Hospital is required' },
    { id: 'specialty', errorId: 'specialtyError', message: 'Specialty is required' },
    { id: 'appointmentDate', errorId: 'dateError', message: 'Date is required' },
    { id: 'appointmentTime', errorId: 'timeError', message: 'Time is required' }
  ];
  
  fields.forEach(field => {
    const input = document.getElementById(field.id);
    const error = document.getElementById(field.errorId);
    
    if (!input.value) {
      error.textContent = field.message;
      input.classList.add('error');
      isValid = false;
    }
  });
  
  return isValid;
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  const formData = {
    patientName: document.getElementById('patientName').value,
    doctorName: document.getElementById('doctorNameInput').value,
    hospitalName: document.getElementById('hospitalName').value,
    specialty: document.getElementById('specialty').value,
    date: document.getElementById('appointmentDate').value,
    time: document.getElementById('appointmentTime').value,
    reason: document.getElementById('reason').value
  };
  
  if (editingAppointmentId) {
    // Update existing appointment
    const index = appointments.findIndex(apt => apt.id === editingAppointmentId);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], ...formData };
      showToast('Appointment updated successfully');
    }
  } else {
    // Create new appointment
    const newAppointment = {
      id: generateId(),
      ...formData,
      createdAt: new Date().toISOString()
    };
    appointments.push(newAppointment);
    showToast('Appointment scheduled successfully');
  }
  
  saveAppointments();
  closeModalFn();
  renderCalendar();
  
  if (currentView === 'dashboard') {
    renderDashboard();
  }
}

function deleteAppointment(id) {
  if (confirm('Are you sure you want to delete this appointment?')) {
    appointments = appointments.filter(apt => apt.id !== id);
    saveAppointments();
    renderCalendar();
    
    if (currentView === 'dashboard') {
      renderDashboard();
    }
    
    showToast('Appointment deleted successfully');
  }
}

// ========================================
// Event Listeners
// ========================================

// Book Appointment Button
bookAppointmentBtn.addEventListener('click', openModal);

// Sidebar Toggle
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Navigation Items
navItems.forEach(item => {
  item.addEventListener('click', () => {
    switchView(item.dataset.view);
  });
});

// Modal Events
closeModal.addEventListener('click', closeModalFn);
cancelBtn.addEventListener('click', closeModalFn);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModalFn();
  }
});

// Form Submit
appointmentForm.addEventListener('submit', handleFormSubmit);

// Calendar Navigation
prevMonth.addEventListener('click', () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonth.addEventListener('click', () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
});

todayBtn.addEventListener('click', () => {
  currentDate = new Date();
  renderCalendar();
});

// Dashboard Filters
updateBtn.addEventListener('click', renderDashboard);
patientSearchInput.addEventListener('input', renderDashboard);
doctorSearchInput.addEventListener('input', renderDashboard);
startDateInput.addEventListener('change', renderDashboard);
endDateInput.addEventListener('change', renderDashboard);

// ========================================
// Initialize App
// ========================================

function init() {
  loadAppointments();
  renderCalendar();
}

// Start the app
init();