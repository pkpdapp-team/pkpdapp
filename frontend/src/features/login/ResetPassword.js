import {api} from "../../Api"
import { makeStyles } from '@material-ui/core/styles';
import React from "react";
import { Link } from "react-router-dom";
import Button from '@material-ui/core/Button';
import { useForm } from "react-hook-form";
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import { useHistory, useParams } from "react-router-dom";
import {FormTextField} from '../forms/FormComponents';
import { ReactComponent as PkpdAppIcon} from '../../logo_pkpdapp_with_text.svg';


const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  icon: {
    margin: theme.spacing(3),
    width: theme.spacing(20),
    height: theme.spacing(8),
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 1, 2),
  },
  links : {
    '& > *': {
      margin: theme.spacing(1),
    }
  },
}));


export default function ResetPassword() {
  const classes = useStyles();
  const { control, handleSubmit } = useForm();

  let { uid, token } = useParams();
  const history = useHistory();

  const onSubmit = (values)=>{
    values = {
      uid, token, ...values
    }
    api.post(
      '/auth/users/reset_password_confirm/', values, false
    ).then(data => {
      history.push('/reset-password-success')
    })
  }

  return (
    <Container component="main" maxWidth="xs">
      <div className={classes.paper}>
        <PkpdAppIcon className={classes.icon}/>
        <Typography component="h1" variant="h5">
          Register new user
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
        <FormTextField 
          variant="outlined"
          fullWidth
          control={control} 
          defaultValue={''}
          name="new_password" label="Password"
        />
        <FormTextField 
          variant="outlined"
          fullWidth
          control={control} 
          defaultValue={''}
          name="re_new_password" label="Verify password"
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
        >
          Submit
        </Button>
        </form>
        <div className={classes.links}>
        <Link to="/login">Back to login</Link>
        </div>
      </div>
    </Container>
  )
}
