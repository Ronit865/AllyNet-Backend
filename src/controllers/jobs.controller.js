import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Job from '../models/jobs.model.js';

const addJob = asyncHandler(async (req, res) => {

    const { title, company, description, location, jobType, category, experienceRequired, salary } = req.body;

    if (!title || !company || !description || !location || !jobType || !category || experienceRequired === undefined || salary === undefined) {
        throw new ApiError(400, "All fields are required");
    }

    const userId = req.user.id;

    const newJob = new Job({
        title,
        description,
        company,
        location,
        jobType,
        category,
        experienceRequired,
        salary,
        postedBy: userId,
    })

    await newJob.save();

    return res
        .status(201)
        .json(new ApiResponse(201, 'Job added successfully', newJob));
});

const editJob = asyncHandler(async (req, res) => {

    const { title, company, description, location, jobType, category, experienceRequired, salary } = req.body;

    const job = await Job.findByIdAndUpdate(
        req.params.id,
        {
            $set: {
                title,
                description,
                company,
                location,
                jobType,
                category,
                experienceRequired,
                salary,
            }
        },
        { new: true, runValidators: true }
    );

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, 'Job updated successfully', job));
});

const deleteJob = asyncHandler(async (req, res) => {

    const job = await Job.findByIdAndDelete(
        req.params.id
    );

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, 'Job deleted successfully', {}));
});

const getAllJobs = asyncHandler(async (req, res) => {
    const jobs = await Job.find().select('+applicants').populate('applicants', 'name email avatar course graduationYear');

    return res
        .status(200)
        .json(new ApiResponse(200, jobs, 'Jobs fetched successfully'));
});

const getMyPostedJobs = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const jobs = await Job.find({ postedBy: userId });

    return res
        .status(200)
        .json(new ApiResponse(200, jobs, 'My posted jobs fetched successfully'));
});

const verifyJob = asyncHandler(async (req, res) => {

    const job = await Job.findByIdAndUpdate(
        req.params.id,
        {
            $set: {
                isVerified: true
            }
        },
        { new: true }
    );

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }
    return res
        .status(200)
        .json(new ApiResponse(200, 'Job verified successfully', job));
});

const jobApply = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    if (job.applicants.includes(userId)) {
        throw new ApiError(400, 'You have already applied for this job');
    }
    // job.applicants.push is used to add the userId to the applicants array
    job.applicants.push(userId);
    await job.save();

    return res
        .status(200)
        .json(new ApiResponse(200, 'Job applied successfully', job));

});

const jobUnapply = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const job = await Job.findById(req.params.id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    if (!job.applicants.includes(userId)) {
        throw new ApiError(400, 'You have not applied for this job');
    }

    // Remove userId from applicants array
    job.applicants = job.applicants.filter(applicantId => applicantId.toString() !== userId);
    await job.save();

    return res
        .status(200)
        .json(new ApiResponse(200, 'Application withdrawn successfully', job));

});

const jobApplicants = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const job = await Job.findById(id).populate('applicants', 'name email resume');

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, job.applicants, 'Job applicants fetched successfully'));
});

const jobRejectByAdmin = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }
    await Job.findByIdAndDelete(id);

    return res
        .status(200)
        .json(new ApiResponse(200, 'Job rejected and deleted successfully', {}));
});


export {
    addJob,
    editJob,
    deleteJob,
    getAllJobs,
    verifyJob,
    jobApply,
    jobUnapply,
    jobApplicants,
    getMyPostedJobs,
    jobRejectByAdmin
}