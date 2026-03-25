document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    // --- Application State ---
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestSession = urlParams.get('guest') === 'true';

    /**
     * Initialize items: 
     * In guest mode (primarily used for testing/demo), we start with a blank list.
     * Otherwise, we load default templates for a better user experience.
     */
    let items = isGuestSession ? [] : [
        { id: 1, desc: 'Script Writing & Screen Recording – Dualite.dev', amount: 750 },
        { id: 2, desc: 'Script Writing & Screen Recording – Wispr Flow', amount: 750 },
        { id: 3, desc: 'Script Writing & Screen Recording – UX Pilot', amount: 750 }
    ];
    let nextId = isGuestSession ? 1 : 4;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('inv-date').value = formattedDate;

    // Default form data
    const defaults = {
        'inv-from': 'Company Name\nAddress Line 1\nAddress Line 2',
        'inv-to': 'Client Name\nAddress Line 1\nAddress Line 2',
        'inv-subject': 'Invoice for Script Preparation and Recording Video – AI Tools',
        'inv-desc': 'This invoice is for the work completed and delivered as per the requirement.\nThe project included preparing detailed scripts and recording complete\nexplanatory videos for the following AI tools:',
        'pay-mode': 'Bank Transfer',
        'pay-acc': '1234567890',
        'pay-ifsc': 'HDFC0001234',
        'pay-upi': 'user@upi',
        'pay-pan': 'ABCDE1234F',
        'pay-email': 'contact@example.com',
        'pay-phone': '+91 9876543210',
        'inv-sign-name': 'Punna Gurunanda'
    };

    // Pre-fill some defaults if empty
    for (const [id, val] of Object.entries(defaults)) {
        if (!document.getElementById(id).value) {
            document.getElementById(id).value = val;
        }
    }

    // Input to Output mapping
    const mappings = [
        { in: 'inv-number', out: 'out-inv-number' },
        { in: 'inv-date', out: 'out-inv-date' },
        { in: 'inv-from', out: 'out-inv-from' },
        { in: 'inv-to', out: 'out-inv-to' },
        { in: 'inv-subject', out: 'out-inv-subject' },
        { in: 'inv-desc', out: 'out-inv-desc' },
        { in: 'inv-sign-msg', out: 'out-inv-sign-msg' },
        { in: 'inv-sign-name', out: 'out-inv-sign-name' },
        // Payment fields mapped specifically below
    ];

    const paymentFields = ['mode', 'acc', 'ifsc', 'upi', 'pan', 'email', 'phone'];

    // --- Render Functions ---

    function renderItemsInput() {
        const container = document.getElementById('items-container');
        container.innerHTML = '';
        
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.id = `item-row-${item.id}`;
            row.innerHTML = `
                <div class="input-group">
                    <label>Item Description</label>
                    <input type="text" class="item-desc-input" data-id="${item.id}" value="${item.desc}">
                </div>
                <div class="input-group">
                    <label>Amount (₹)</label>
                    <input type="number" class="item-amt-input" data-id="${item.id}" value="${item.amount}">
                </div>
                <button type="button" class="btn-remove-item" data-id="${item.id}" title="Remove Item">
                    <i class="ri-delete-bin-line"></i>
                </button>
            `;
            container.appendChild(row);
        });

        attachItemListeners();
        updatePreview();
    }

    function attachItemListeners() {
        document.querySelectorAll('.item-desc-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = items.find(i => i.id === id);
                if (item) item.desc = e.target.value;
                updatePreview();
            });
        });

        document.querySelectorAll('.item-amt-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = items.find(i => i.id === id);
                if (item) item.amount = parseFloat(e.target.value) || 0;
                updatePreview();
            });
        });

        document.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.target.closest('.btn-remove-item');
                const id = parseInt(btnEl.dataset.id);
                const row = document.getElementById(`item-row-${id}`);
                
                // Animation before remove
                row.classList.add('removing');
                setTimeout(() => {
                    items = items.filter(i => i.id !== id);
                    renderItemsInput();
                }, 300); // match CSS animation time
            });
        });
    }

    function updatePreview() {
        // Sync static fields
        mappings.forEach(m => {
            const inVal = document.getElementById(m.in).value;
            // Handle newlines safely using innerText or styling pre-line
            document.getElementById(m.out).innerText = inVal;
        });

        // Sync payment fields (hide row if empty)
        paymentFields.forEach(field => {
            const val = document.getElementById(`pay-${field}`).value;
            const row = document.getElementById(`row-pay-${field}`);
            const out = document.getElementById(`out-pay-${field}`);
            
            if (val.trim() === '') {
                row.style.display = 'none';
            } else {
                row.style.display = 'flex';
                out.innerText = val;
            }
        });

        // Sync Items Table
        const tbody = document.getElementById('out-items-body');
        tbody.innerHTML = '';
        let total = 0;

        // Render rows
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.desc}</td>
                <td class="col-amt">${item.amount}</td>
            `;
            tbody.appendChild(tr);
            total += item.amount;
        });

        // Render empty row to match reference style if needed
        const emptyTr = document.createElement('tr');
        emptyTr.innerHTML = `<td>&nbsp;</td><td class="col-amt">&nbsp;</td>`;
        tbody.appendChild(emptyTr);

        // Update total
        document.getElementById('out-total').innerText = total;
    }

    // --- Listeners ---

    // Listen to all inputs for live update
    document.querySelectorAll('input, textarea').forEach(el => {
        if (!el.classList.contains('item-desc-input') && !el.classList.contains('item-amt-input')) {
            el.addEventListener('input', updatePreview);
        }
    });

    // Add item button
    document.getElementById('btn-add-item').addEventListener('click', () => {
        items.push({ id: nextId++, desc: '', amount: 0 });
        renderItemsInput();
        // Scroll to bottom of items
        setTimeout(() => {
            const container = document.getElementById('items-container');
            container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
    });

    // PDF Generation
    async function generatePDF() {
        const element = document.getElementById('invoice-preview');
        const invNum = document.getElementById('inv-number').value || 'Invoice';
        
        const opt = {
            margin:       [20, 0],
            filename:     `${invNum}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', '.pay-row', '.party-block', '.invoice-meta'] }
        };

        // Add loading state to button
        const btns = [document.getElementById('btn-generate-desktop'), document.getElementById('btn-generate-mobile')].filter(Boolean);
        const originalHtmls = btns.map(btn => btn.innerHTML);

        btns.forEach(btn => {
            btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving & Generating...';
            btn.style.pointerEvents = 'none';
        });

        try {
            const worker = html2pdf().set(opt).from(element);
            
            // Generate PDF as blob
            const pdfBlob = await worker.output('blob');

            // 1. Upload logic & DB saving
            if (window.currentUser && window.supabaseClient) {
                const userId = window.currentUser.id;
                const fileName = `${userId}/${Date.now()}_${invNum}.pdf`;

                const { error: uploadErr } = await window.supabaseClient.storage
                    .from('invoice-pdfs')
                    .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

                let pdfUrl = '';
                if (!uploadErr) {
                    const { data } = window.supabaseClient.storage.from('invoice-pdfs').getPublicUrl(fileName);
                    pdfUrl = data.publicUrl;
                }

                const totalAmt = parseFloat(document.getElementById('out-total').innerText) || 0;
                const newInvoice = {
                    user_id: userId,
                    invoice_number: document.getElementById('inv-number').value,
                    invoice_date: document.getElementById('inv-date').value,
                    from_party: document.getElementById('inv-from').value,
                    to_party: document.getElementById('inv-to').value,
                    subject: document.getElementById('inv-subject').value,
                    description: document.getElementById('inv-desc').value,
                    pay_mode: document.getElementById('pay-mode').value,
                    pay_acc: document.getElementById('pay-acc').value,
                    pay_ifsc: document.getElementById('pay-ifsc').value,
                    pay_upi: document.getElementById('pay-upi').value,
                    pay_pan: document.getElementById('pay-pan').value,
                    pay_email: document.getElementById('pay-email').value,
                    pay_phone: document.getElementById('pay-phone').value,
                    sign_msg: document.getElementById('inv-sign-msg').value,
                    sign_name: document.getElementById('inv-sign-name').value,
                    pdf_url: pdfUrl,
                    total_amount: totalAmt
                };

                const { data: invoiceData, error: dbErr } = await window.supabaseClient
                    .from('invoices')
                    .insert(newInvoice)
                    .select('id')
                    .single();

                if (!dbErr && invoiceData) {
                    const itemsToSave = items.map((item, index) => ({
                        invoice_id: invoiceData.id,
                        sort_order: index,
                        description: item.desc,
                        amount: item.amount
                    }));

                    if (itemsToSave.length > 0) {
                        await window.supabaseClient.from('invoice_items').insert(itemsToSave);
                    }
                }
            }
            
            // 2. Local download
            await worker.save();

        } catch (error) {
            console.error("PDF Generation/Upload Error:", error);
            alert("Error generating or saving invoice. Please try again.");
        } finally {
            // Restore buttons
            btns.forEach((btn, index) => {
                btn.innerHTML = originalHtmls[index];
                btn.style.pointerEvents = 'auto';
            });
        }
    }

    document.getElementById('btn-generate-desktop').addEventListener('click', generatePDF);
    document.getElementById('btn-generate-mobile')?.addEventListener('click', generatePDF);

    // --- Initialization ---
    renderItemsInput();
});
