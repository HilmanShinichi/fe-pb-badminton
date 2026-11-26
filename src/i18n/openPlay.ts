// Open Play i18n translations
export const openPlayTranslationsId = {
  openPlay: {
    title: "Open Play",
    description: "Daftar untuk bermain badminton bersama",
    joinSession: "Daftar Open Play",
    
    // Session listing
    availableSessions: "Sesi Tersedia",
    noSessions: "Tidak ada sesi open play yang tersedia",
    upcomingSessions: "Sesi Mendatang",
    pastSessions: "Sesi Lalu",
    
    // Session details
    scheduleDate: "Tanggal",
    startTime: "Jam Mulai",
    endTime: "Jam Selesai",
    venue: "GOR / Venue",
    maxMembers: "Kapasitas Member",
    maxNonMembers: "Kapasitas Non-Member",
    maxWaitingList: "Daftar Tunggu Maks",
    cancellationWindow: "Jendela Pembatalan",
    memberSlots: "Slot Member",
    nonMemberSlots: "Slot Non-Member",
    waitingList: "Daftar Tunggu",
    registeredMembers: "Member Terdaftar",
    registeredNonMembers: "Non-Member Terdaftar",
    
    // Participant types
    memberType: "Member",
    nonMemberType: "Non-Member",
    
    // Status
    registered: "Terdaftar",
    waiting: "Menunggu",
    cancelled: "Dibatalkan",
    autoFilled: "Otomatis Terisi",
    
    // Actions
    join: "Daftar",
    cancel: "Batalkan Pendaftaran",
    joinAs: "Daftar Sebagai",
    selectType: "Pilih Tipe Partisipasi",
    
    // Forms
    participationType: "Tipe Partisipasi",
    cancellationReason: "Alasan Pembatalan",
    reasonRequired: "Alasan pembatalan harus diisi",
    enterReason: "Jelaskan alasan pembatalan...",
    reviewNotes: "Catatan Review",
    
    // Admin
    adminPanel: "Panel Admin",
    createSession: "Buat Sesi Baru",
    editSession: "Ubah Sesi",
    deleteSession: "Hapus Sesi",
    deleteSessionConfirm: "Yakin hapus sesi ini? Semua pendaftaran akan dihapus.",
    manageParticipants: "Kelola Peserta",
    pendingCancellations: "Pembatalan Menunggu Approval",
    noCancellations: "Tidak ada permintaan pembatalan yang menunggu",
    approveCancellation: "Setujui Pembatalan",
    rejectCancellation: "Tolak Pembatalan",
    removeParticipant: "Hapus Peserta",
    
    // Notifications
    joinedSuccessfully: "Berhasil mendaftar open play",
    joinedWaitingList: "Mendaftar di daftar tunggu",
    cancelledSuccessfully: "Pembatalan berhasil diajukan",
    cancellationApproved: "Pembatalan disetujui",
    cancellationRejected: "Pembatalan ditolak",
    participantRemoved: "Peserta dihapus",
    sessionCreated: "Sesi berhasil dibuat",
    sessionUpdated: "Sesi berhasil diperbarui",
    sessionDeleted: "Sesi berhasil dihapus",
    
    // Errors
    joinFailed: "Gagal mendaftar, silakan coba lagi",
    alreadyJoined: "Anda sudah mendaftar sesi ini",
    slotsFullWaitingList: "Slot penuh dan daftar tunggu juga penuh",
    memberSlotsFull: "Slot member penuh, mendaftar di daftar tunggu",
    nonMemberSlotsFull: "Slot non-member penuh, mendaftar di daftar tunggu",
    sessionClosed: "Sesi ini tidak menerima pendaftaran lagi",
    
    // Columns
    playerName: "Nama Pemain",
    joinedAt: "Terdaftar",
    participantStatus: "Status",
    actions: "Aksi",
    
    // Messages
    hoursBeforeDeadline: (hours: number) => `Pembatalan hanya bisa dilakukan ${hours} jam sebelum sesi dimulai`,
    slotsAvailable: (available: number, max: number) => `${available} dari ${max} slot tersedia`,
  },
};

export const openPlayTranslationsEn = {
  openPlay: {
    title: "Open Play",
    description: "Register to play badminton with us",
    joinSession: "Register for Open Play",
    
    // Session listing
    availableSessions: "Available Sessions",
    noSessions: "No open play sessions available",
    upcomingSessions: "Upcoming Sessions",
    pastSessions: "Past Sessions",
    
    // Session details
    scheduleDate: "Date",
    startTime: "Start Time",
    endTime: "End Time",
    venue: "Venue",
    maxMembers: "Member Capacity",
    maxNonMembers: "Non-Member Capacity",
    maxWaitingList: "Max Waiting List",
    cancellationWindow: "Cancellation Window",
    memberSlots: "Member Slots",
    nonMemberSlots: "Non-Member Slots",
    waitingList: "Waiting List",
    registeredMembers: "Registered Members",
    registeredNonMembers: "Registered Non-Members",
    
    // Participant types
    memberType: "Member",
    nonMemberType: "Non-Member",
    
    // Status
    registered: "Registered",
    waiting: "Waiting",
    cancelled: "Cancelled",
    autoFilled: "Auto-Filled",
    
    // Actions
    join: "Register",
    cancel: "Cancel Registration",
    joinAs: "Register As",
    selectType: "Select Participation Type",
    
    // Forms
    participationType: "Participation Type",
    cancellationReason: "Cancellation Reason",
    reasonRequired: "Cancellation reason is required",
    enterReason: "Explain your cancellation reason...",
    reviewNotes: "Review Notes",
    
    // Admin
    adminPanel: "Admin Panel",
    createSession: "Create New Session",
    editSession: "Edit Session",
    deleteSession: "Delete Session",
    deleteSessionConfirm: "Are you sure you want to delete this session? All registrations will be removed.",
    manageParticipants: "Manage Participants",
    pendingCancellations: "Pending Cancellation Approvals",
    noCancellations: "No pending cancellation requests",
    approveCancellation: "Approve Cancellation",
    rejectCancellation: "Reject Cancellation",
    removeParticipant: "Remove Participant",
    
    // Notifications
    joinedSuccessfully: "Successfully registered for open play",
    joinedWaitingList: "Added to waiting list",
    cancelledSuccessfully: "Cancellation request submitted",
    cancellationApproved: "Cancellation approved",
    cancellationRejected: "Cancellation rejected",
    participantRemoved: "Participant removed",
    sessionCreated: "Session created successfully",
    sessionUpdated: "Session updated successfully",
    sessionDeleted: "Session deleted successfully",
    
    // Errors
    joinFailed: "Failed to register, please try again",
    alreadyJoined: "You are already registered for this session",
    slotsFullWaitingList: "Slots are full and waiting list is also full",
    memberSlotsFull: "Member slots are full, added to waiting list",
    nonMemberSlotsFull: "Non-member slots are full, added to waiting list",
    sessionClosed: "This session is no longer accepting registrations",
    
    // Columns
    playerName: "Player Name",
    joinedAt: "Registered",
    participantStatus: "Status",
    actions: "Actions",
    
    // Messages
    hoursBeforeDeadline: (hours: number) => `Cancellations can only be made ${hours} hours before the session starts`,
    slotsAvailable: (available: number, max: number) => `${available} of ${max} slots available`,
  },
};
