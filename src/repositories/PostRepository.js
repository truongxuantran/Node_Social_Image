import database from '../../models/index';
import {
    responseError,
    responseUnAuthorization,
    checkStatusToken,
    checkToken
} from '../utils';
import jwt from 'jsonwebtoken';
import Resize from './middleware/ResizeImage';
import path from 'path';

const Album = database.albums;
const Post = database.posts;
const Image = database.images;

const createAlbum = async (req, res, next) => {
    const token = checkToken(req, res);
    if (!token) return;
    jwt.verify(token, 'SocialImage', async (err, decoded)  => {
        const status = checkStatusToken(req, res, err, decoded)
        if (!status) return;
        const userId = decoded.id;
        req.assert('name', 'Album name cannot empty').notEmpty();
        const errors = req.validationErrors();
        if(!errors){
            const albumName = req.sanitize('name').escape().trim();
            const albumRow = await Album.findOne({ where: { name: albumName, user_id: userId } });
            if(albumRow){
                res.send(responseError(false, null, 'Album name has exited'));
            }else{
                Album.create({ name: albumName, user_id: userId });
                res.send(responseError(true, null, 'Create album success'));
            }
        }else{
            res.send(responseError(false, null, errors));
        }
    });
}

const createPost = async (req, res) => {
    const token = checkToken(req, res);
    if (!token) return;
    jwt.verify(token, 'SocialImage', async (err, decoded)  => {
        const status = checkStatusToken(req, res, err, decoded)
        if (!status) return;
        const title = req.sanitize('title').escape().trim();
        const images = req.sanitize('images').escape().trim();
        if(!title || title.length === 0){
            res.send(responseError(false, null, "TItle cannot empty"));
            return;
        }
        const newPost = await Post.create({ title: title, user_id: decoded.id});
        if(newPost && newPost._previousDataValues && newPost._previousDataValues.id){
            const postId = newPost._previousDataValues.id;
            if(images.length > 0){
                const arrayImage = images.split(',');
                const paramsImage = arrayImage.map(e => {
                    return {
                        path: e,
                        post_id: postId,
                    };
                });
                await Image.bulkCreate(paramsImage);
                res.send(responseError(true, null, "Create new post success"));
            }

        }else{
            res.send(responseError(false, null, "Create new post error"));
        }
    });
}
const uploadImage = async (req, res) => {
    const imagePath = path.join(process.cwd(), '/public/images');
    const fileUpload = new Resize(imagePath);
    if (!req.file) {
      res.send(responseError(false, null, 'Please provide an image'));
    }
    const filename = await fileUpload.save(req.file.buffer);
    return res.status(200).json({ name: filename });
}

const albumRepository = {
    createAlbum,
    uploadImage,
    createPost
}

export default albumRepository;


