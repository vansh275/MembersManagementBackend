const express = require('express');
const app=express();
const mongoose=require('mongoose');
const cors=require('cors');
const { ServerMonitoringMode } = require('mongodb');
app.use(express.json());
app.use(cors());
require('dotenv').config();

const PORT= process.env.PORT || 3001
const DATABASE= process.env.DATABASE

    // mongoose.connect('mongodb://localhost:27017/Members');

    
mongoose.connect(DATABASE);
//hashing bcrypt
const bcrypt = require('bcrypt');
const saltRounds =10





const UserSchema = new mongoose.Schema({
    name:String,
    pass:String,
    members:[
        {
            // _id:String,
            name:String,
            contact:String,
            expireDate:Date
        }
    ]
});

//middleware



const User=mongoose.model('users',UserSchema);


app.listen(PORT,()=>{
    console.log('listening to '+PORT);
})

app.get('/check',(req,res)=>{
    res.sendStatus(200);
});

app.get('/:id', async (req, res) => {
    const IdReceived=req.params.id;

    try {
        const data=await User.findById(IdReceived);
        //console.log(IdReceived);
        if(data){
            res.status(200).send(data.members);
            return;
        }
        res.status(400).send({error:'not found'});
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/create/:id',async (req,res)=>{
    const {name,contact}=req.body;
    const currentDate = new Date();
    const expireDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + parseInt(req.body.expireDate), currentDate.getDate());
    console.log('expire data '+expireDate);

    const IdReceived=req.params.id;
    
    try{
        const user=await User.findById(IdReceived);

        if(user){ 
            user.members.push({name,contact,expireDate});
            await user.save();
            res.sendStatus(200);
            return;
        }     
        res.status(400).send({error:'not found'});
        
    }catch(err){
        console.log(err);
        res.status(500).send({error:'An error occured while creating the member'});
    }
});
app.put('/update/:ownerId/:memberId',async (req,res)=>{
    const currentDate = new Date();
    const expirationDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + parseInt(req.body.expireDate), currentDate.getDate());

    const {ownerId,memberId}=req.params;
    const{name,contact}=req.body;
    console.log('server side '+ownerId+' '+memberId);
    try {
        const user=await User.findOneAndUpdate(
            {_id:ownerId,'members._id':memberId},
            {$set:{'members.$.name':name,'members.$.contact':contact,'members.$.expireDate':expirationDate}}
        );
        if(user){
            res.status(200).send(user.members.id(memberId));
        }
        else{
            res.status(404).send({error:'kuch ni mila'});
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.delete('/delete/:ownerId/:memberId',async (req,res)=>{
    const {ownerId,memberId}=req.params;
    // const IdCollectionName= getIdModel(collectionId);
    try {
        const user=await User.findOneAndUpdate(
            {_id:ownerId},
            {$pull:{members:{_id:memberId}}}
        )
        if(user){
            res.sendStatus(200);
        }
        else{
            res.status(404).send({error:'nahi ha ye'});
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.post('/newuser',async(req,res)=>{
    const userName=req.body.userName;
    const alreadyExist= await User.findOne({name:userName});
    if(alreadyExist){
        res.sendStatus(400);
    }
    else{
        const hashedPass=await bcrypt.hash(req.body.userPass,saltRounds);
        const newUser=new User({
            name:userName,
            pass:hashedPass,
            members:[]
        })
        await newUser.save();
        res.sendStatus(200);
    }
});

app.post('/alreadyuser',async(req,res)=>{
    const userName=req.body.signinName;
    const userPass=req.body.signinPass;
    // const hashedPass=await bcrypt.hash(userPass,saltRounds);
    // console.log('hashedpass '+hashedPass);
    const Exist= await User.findOne({name:userName});    
    if(Exist){
        const match=await bcrypt.compare(userPass,Exist.pass)
        if(match){
            res.status(200).send(Exist._id);
        }
        else{
            console.log('diff');
            res.sendStatus(400)
        }
    }
    // console.log(alreadyExist);
    // console.log('org pass '+alreadyExist.pass);
    // console.log('recived pass '+hashedPass);

});

app.get('/updateDetail/:ownerId/:memberId',async (req,res)=>{
    const ownerId=req.params.ownerId;
    const memberId=req.params.memberId;
 
    try{
        const data=await User.findOne({_id:ownerId});
        if(data){
            const member=data.members.id(memberId);
            if(member){
                // console.log('found member');
                res.status(200).send(member);
            }
            else{
                res.status(400).send({error:'member ni mila'});
            }
        }
        else{
            res.status(400).send({error:'nahi mila owner'});
        }
    }catch(err){
        console.log(err);
        res.status(500).send({error:'internal server error'});
    }
});



