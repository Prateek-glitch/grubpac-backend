const db = require('../utils/db');
const { getActiveContent } = require('../services/schedulingService');

const uploadContent = async (req, res) => {
    console.log('RECV BODY:', req.body);
    console.log('RECV FILE:', req.file);
    const { title, description, subject, start_time, end_time, duration } = req.body;
    const file = req.file;

    if (!title || !subject || !file) {
        return res.status(400).json({ error: 'Title, subject, and file are mandatory.' });
    }

    try {
        await db.query('BEGIN');
        
        const contentQuery = `
            INSERT INTO content 
            (title, description, subject, file_url, file_type, file_size, uploaded_by, start_time, end_time) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
        `;
        const contentValues = [
            title, description, subject, file.path, file.mimetype, file.size, 
            req.user.id, start_time || null, end_time || null
        ];
        
        const contentResult = await db.query(contentQuery, contentValues);
        const newContentId = contentResult.rows[0].id;

        // Insert default schedule if duration is provided
        if (duration) {
            await db.query(
                'INSERT INTO content_schedule (content_id, duration) VALUES ($1, $2)',
                [newContentId, duration]
            );
        }

        await db.query('COMMIT');
        res.status(201).json({ message: 'Content uploaded successfully. Status: pending', contentId: newContentId });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: 'Database error during upload.' });
    }
};

const reviewContent = async (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // status: 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status update.' });
    }
    if (status === 'rejected' && !rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    try {
        const query = `
            UPDATE content 
            SET status = $1, rejection_reason = $2, approved_by = $3, approved_at = NOW() 
            WHERE id = $4 RETURNING id, status
        `;
        const values = [status, status === 'rejected' ? rejection_reason : null, req.user.id, id];
        
        const result = await db.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Content not found.' });

        res.json({ message: `Content ${status} successfully.`, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error updating content status.' });
    }
};

const getLiveContent = async (req, res) => {
    const { teacherId } = req.params;
    const { subject } = req.query; // Optional subject filter

    try {
        let query = `
            SELECT c.*, cs.duration 
            FROM content c
            LEFT JOIN content_schedule cs ON c.id = cs.content_id
            WHERE c.uploaded_by = $1 AND c.status = 'approved'
        `;
        const values = [teacherId];

        if (subject) {
            query += ` AND c.subject = $2`;
            values.push(subject);
        }

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            // Case 1 & 3: No content or invalid subject
            return res.json({ message: "No content available", data: null });
        }

        // Apply Time and Rotation Logic
        const activeContent = getActiveContent(result.rows);

        if (!activeContent) {
            // Case 2: Approved but not scheduled/active right now
            return res.json({ message: "No content available", data: null });
        }

        res.json({
            message: "Live content fetched successfully",
            data: {
                title: activeContent.title,
                subject: activeContent.subject,
                file_url: activeContent.file_url,
                description: activeContent.description
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching live content.' });
    }
};

module.exports = { uploadContent, reviewContent, getLiveContent };